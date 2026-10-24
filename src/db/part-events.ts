import { eq } from "drizzle-orm";
import { tEn, type T } from "@/i18n";
import { partName } from "@/lib/default-parts";
import { UserError } from "@/lib/user-error";
import type { PartEventType } from "./schema";
import { setOdometer } from "./bikes";
import { bikes, partEvents, parts, type Part } from "./schema";
import type { db } from "./index";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A user-facing problem with the requested change (shown as a form error). */
export class PartEventError extends UserError {}

export type NewPartEvent = {
  type: Exclude<PartEventType, "installed">;
  description?: string | null;
  date: string;
  odometerKm: number;
  cost?: number | null;
  resetsInterval: boolean;
  serviceRoundId?: number | null;
  /** Details of the new part when `type` is "replaced". */
  replacement?: { brand?: string | null; model?: string | null; cost?: number | null };
};

/**
 * Records a maintenance event on a part. A replacement retires the part and installs a new
 * one in its place; the new part is returned so callers can link to it.
 */
export function recordPartEvent(
  tx: Tx,
  part: Part,
  event: NewPartEvent,
  t: T = tEn,
): Part | undefined {
  if (part.status === "retired") throw new PartEventError("errors.partAlreadyReplaced");

  if (event.type === "replaced") {
    return replacePart(
      tx,
      part,
      {
        date: event.date,
        odometerKm: event.odometerKm,
        note: event.description,
        serviceRoundId: event.serviceRoundId,
        ...event.replacement,
      },
      t,
    );
  }

  tx.insert(partEvents)
    .values({
      partId: part.id,
      type: event.type,
      description: event.description ?? null,
      date: event.date,
      odometerKm: event.odometerKm,
      cost: event.cost ?? null,
      resetsInterval: event.resetsInterval,
      serviceRoundId: event.serviceRoundId ?? null,
    })
    .run();
}

type Replacement = {
  date: string;
  odometerKm: number;
  note?: string | null;
  serviceRoundId?: number | null;
  brand?: string | null;
  model?: string | null;
  cost?: number | null;
};

/**
 * Retires `part` and installs a fresh one of the same kind with the same intervals.
 * The old part keeps its history and ends with a "replaced" event; the new one starts with
 * an "installed" event. Only the old part's event links to a service round, so a round lists
 * each replaced part once.
 */
/** `t` writes the new part's "replaces the previous …" entry in the user's language. */
export function replacePart(tx: Tx, part: Part, r: Replacement, t: T = tEn): Part {
  if (r.date < part.installedAt) {
    throw new PartEventError("errors.replacementBeforeInstall");
  }

  const fresh = tx
    .insert(parts)
    .values({
      bikeId: part.bikeId,
      category: part.category,
      kind: part.kind,
      name: part.name,
      svgZone: part.svgZone,
      serviceIntervalKm: part.serviceIntervalKm,
      serviceIntervalDays: part.serviceIntervalDays,
      replaceIntervalKm: part.replaceIntervalKm,
      replaceIntervalDays: part.replaceIntervalDays,
      sortOrder: part.sortOrder,
      brand: r.brand ?? null,
      model: r.model ?? null,
      cost: r.cost ?? null,
      installedAt: r.date,
      installedKm: r.odometerKm,
    })
    .returning()
    .get();

  tx.update(parts)
    .set({
      status: "retired",
      retiredAt: r.date,
      retiredKm: r.odometerKm,
      replacedByPartId: fresh.id,
    })
    .where(eq(parts.id, part.id))
    .run();

  tx.insert(partEvents)
    .values([
      {
        partId: part.id,
        type: "replaced",
        description: r.note ?? null,
        date: r.date,
        odometerKm: r.odometerKm,
        resetsInterval: true,
        serviceRoundId: r.serviceRoundId ?? null,
      },
      {
        partId: fresh.id,
        type: "installed",
        // The note explains why the old part went; the new part just records what it replaced.
        description: t("events.replacesPrevious", { part: partName(part, t).toLowerCase() }),
        date: r.date,
        odometerKm: r.odometerKm,
        resetsInterval: true,
      },
    ])
    .run();

  return fresh;
}

/** Moves the bike's odometer forward when a higher reading is logged; never backwards. */
export function bumpOdometer(tx: Tx, bikeId: number, odometerKm: number) {
  const bike = tx.select().from(bikes).where(eq(bikes.id, bikeId)).get();
  if (bike && odometerKm > bike.odometerKm) setOdometer(tx, bike, odometerKm);
}
