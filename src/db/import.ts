import { eq } from "drizzle-orm";
import { z } from "zod";
import { UserError } from "@/lib/user-error";
import { EXPORT_VERSION } from "./export";
import { db } from "./index";
import {
  bikes,
  bikeTypes,
  brakeTypes,
  partCategories,
  partEvents,
  partEventTypes,
  parts,
  serviceRounds,
} from "./schema";

/** A user-facing reason the file couldn't be imported. Nothing has been written. */
export class ImportError extends UserError {}

// Mirrors what buildExport (./export.ts) writes. Keys that aren't listed, such as ids of the
// old install's users, are dropped by zod.

const id = z.number().int();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date like 2026-10-23");
const timestamp = z.iso.datetime().transform((s) => new Date(s));
const text = (max: number) => z.string().max(max);
const optionalText = (max: number) => z.string().max(max).nullable().default(null);
const km = z.number().nonnegative();
const money = z.number().nonnegative().nullable().default(null);
const interval = z.number().int().positive().nullable().default(null);

const eventSchema = z.object({
  date: day,
  odometerKm: km.nullable().default(null),
  type: z.enum(partEventTypes),
  description: optionalText(2000),
  cost: money,
  resetsInterval: z.boolean().default(false),
  serviceRoundId: id.nullable().default(null),
  createdAt: timestamp.optional(),
});

const partSchema = z.object({
  id,
  category: z.enum(partCategories),
  kind: text(60),
  name: text(120),
  brand: optionalText(120),
  model: optionalText(120),
  svgZone: optionalText(60),
  installedAt: day,
  installedKm: km.default(0),
  serviceIntervalKm: interval,
  serviceIntervalDays: interval,
  replaceIntervalKm: interval,
  replaceIntervalDays: interval,
  cost: money,
  status: z.enum(["active", "retired"]).default("active"),
  retiredAt: day.nullable().default(null),
  retiredKm: km.nullable().default(null),
  replacedByPartId: id.nullable().default(null),
  sortOrder: z.number().int().default(0),
  events: z.array(eventSchema).max(10_000),
});

const roundSchema = z.object({
  id,
  date: day,
  shop: optionalText(120),
  odometerKm: km,
  totalCost: money,
  notes: optionalText(2000),
  createdAt: timestamp.optional(),
});

const bikeSchema = z.object({
  name: text(120).min(1),
  type: z.enum(bikeTypes).default("road"),
  brakeType: z.enum(brakeTypes).default("disc"),
  brand: optionalText(120),
  model: optionalText(120),
  color: optionalText(40),
  purchasedAt: day.nullable().default(null),
  purchasePrice: money,
  odometerKm: km.default(0),
  archivedAt: timestamp.nullable().default(null),
  createdAt: timestamp.optional(),
  parts: z.array(partSchema).max(1000),
  serviceRounds: z.array(roundSchema).max(10_000),
});

export const importSchema = z.object({
  app: z.literal("BikePro"),
  version: z.number().int().positive(),
  bikes: z.array(bikeSchema).max(500),
});

export type ImportSummary = { bikes: number; parts: number; events: number };

/** Checks the file and says what's wrong with it in words a user can act on. */
export function parseImport(data: unknown): z.infer<typeof importSchema> {
  const head = z.object({ app: z.literal("BikePro"), version: z.number() }).safeParse(data);
  if (!head.success) throw new ImportError("errors.importNotExport");
  if (head.data.version > EXPORT_VERSION) {
    throw new ImportError("errors.importNewer");
  }
  const parsed = importSchema.safeParse(data);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join(".") || "?";
    throw new ImportError("errors.importDamaged", { path });
  }
  return parsed.data;
}

/**
 * Adds the bikes from an export to the user's account as new bikes, in one transaction. Every
 * id is new; links between records (events → parts and service rounds, a retired part → the
 * part that replaced it) are remapped. Strava links are left out: link the bikes again in
 * Settings. Odometer readings are kept.
 */
export function importData(userId: number, data: unknown): ImportSummary {
  const input = parseImport(data);
  const summary: ImportSummary = { bikes: 0, parts: 0, events: 0 };

  db.transaction((tx) => {
    for (const { parts: bikeParts, serviceRounds: rounds, ...bike } of input.bikes) {
      const bikeId = tx
        .insert(bikes)
        .values({ ...bike, userId })
        .returning({ id: bikes.id })
        .get().id;
      summary.bikes++;

      const roundIds = new Map<number, number>();
      for (const { id: oldId, ...round } of rounds) {
        const newId = tx
          .insert(serviceRounds)
          .values({ ...round, bikeId })
          .returning({ id: serviceRounds.id })
          .get().id;
        roundIds.set(oldId, newId);
      }

      const partIds = new Map<number, number>();
      for (const { id: oldId, events, ...part } of bikeParts) {
        const partId = tx
          .insert(parts)
          .values({ ...part, bikeId, replacedByPartId: null })
          .returning({ id: parts.id })
          .get().id;
        partIds.set(oldId, partId);
        summary.parts++;

        for (const { serviceRoundId, ...event } of events) {
          tx.insert(partEvents)
            .values({
              ...event,
              partId,
              serviceRoundId:
                serviceRoundId === null ? null : (roundIds.get(serviceRoundId) ?? null),
            })
            .run();
          summary.events++;
        }
      }

      // Replacements point at parts that may come later in the file, so link them last.
      for (const part of bikeParts) {
        const replacedBy = part.replacedByPartId && partIds.get(part.replacedByPartId);
        if (replacedBy) {
          tx.update(parts)
            .set({ replacedByPartId: replacedBy })
            .where(eq(parts.id, partIds.get(part.id)!))
            .run();
        }
      }
    }
  });

  return summary;
}
