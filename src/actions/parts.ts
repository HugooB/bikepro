"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { getOwnedBike, getOwnedEvent, getOwnedPart } from "@/db/access";
import { bumpOdometer, recordPartEvent } from "@/db/part-events";
import { partCategories, partEvents, parts, type DistanceUnit, type Part } from "@/db/schema";
import type { T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { dateField } from "@/lib/dates";
import { partNameToStore } from "@/lib/default-parts";
import { loggableEventTypes } from "@/lib/event-types";
import { monthsToDays } from "@/lib/format";
import { inputToKm, intervalToKm } from "@/lib/units";
import { UserError } from "@/lib/user-error";

// Distances arrive in the user's unit (km or mi) and are stored in km; see lib/units.

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const optionalNumber = (t: T, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: t("validation.mustBeNumber", { label }) })
      .min(0, t("validation.cannotBeNegative", { label }))
      .optional(),
  );
const distanceField = (t: T, enter: string) =>
  z.coerce.number({ error: enter }).min(0, t("validation.distanceNegative"));

/** Part pages, the bike page and history all show part data, so refresh the whole bike. */
function revalidateBike(bikeId: number) {
  revalidatePath(`/bikes/${bikeId}`, "layout");
}

const eventSchema = (t: T) =>
  z.object({
    partId: z.coerce.number().int().positive(),
    type: z.enum(loggableEventTypes, { error: t("part.errors.chooseType") }),
    description: optionalText(200),
    date: dateField(t),
    odometerKm: distanceField(t, t("validation.enterOdometer")),
    cost: optionalNumber(t, t("validation.labels.cost")),
    resetsInterval: z.preprocess((v) => v === "on", z.boolean()),
    newBrand: optionalText(60),
    newModel: optionalText(80),
  });

export async function addPartEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = eventSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  const input = parsed.data;

  const part = getOwnedPart(user.id, input.partId);
  if (!part) return { ok: false, error: t("common.partNotFound") };
  // The form starts at the bike's odometer; left as it is, that reading is kept exactly.
  const bike = getOwnedBike(user.id, part.bikeId)!;
  const odometerKm = inputToKm(input.odometerKm, user.distanceUnit, bike.odometerKm);

  const replacing = input.type === "replaced";
  let newPartId: number | undefined;
  try {
    db.transaction((tx) => {
      const fresh = recordPartEvent(
        tx,
        part,
        {
          type: input.type,
          description: input.description,
          date: input.date,
          odometerKm,
          // For a replacement the price belongs to the new part, not the event.
          cost: replacing ? null : input.cost,
          resetsInterval: input.resetsInterval,
          replacement: { brand: input.newBrand, model: input.newModel, cost: input.cost },
        },
        t,
      );
      newPartId = fresh?.id;
      bumpOdometer(tx, part.bikeId, odometerKm);
    });
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars) };
    throw e;
  }

  revalidateBike(part.bikeId);
  // The old part is now retired, so continue on the page of the one that replaced it.
  if (newPartId) redirect(`/bikes/${part.bikeId}/parts/${newPartId}?replaced=1`);
  return { ok: true, savedAt: Date.now() };
}

export async function deletePartEvent(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("eventId"));
  if (!Number.isInteger(id)) return;

  const owned = getOwnedEvent(user.id, id);
  const event = owned && { ...owned.event, part: owned.part };
  // Kept: the "installed" origin, entries that belong to a service round, and the history
  // of retired parts.
  if (
    !event ||
    event.type === "installed" ||
    event.serviceRoundId !== null ||
    event.part.status === "retired"
  ) {
    return;
  }

  db.delete(partEvents).where(eq(partEvents.id, id)).run();
  revalidateBike(event.part.bikeId);
}

const partFields = (t: T) => ({
  name: z.string().trim().min(1, t("part.errors.nameRequired")).max(80),
  brand: optionalText(60),
  model: optionalText(80),
  installedAt: dateField(t),
  installedKm: distanceField(t, t("part.errors.enterInstallOdometer")),
  serviceKm: optionalNumber(t, t("validation.labels.serviceDistance")),
  serviceMonths: optionalNumber(t, t("validation.labels.serviceMonths")),
  replaceKm: optionalNumber(t, t("validation.labels.replaceDistance")),
  replaceMonths: optionalNumber(t, t("validation.labels.replaceMonths")),
  cost: optionalNumber(t, t("validation.labels.price")),
});

/**
 * The row values for a part form. `current` holds what the form was filled with, so values
 * the user left alone keep exactly what's stored: distances, and a template name shown in
 * the user's language.
 */
function partValues(
  input: z.infer<z.ZodObject<ReturnType<typeof partFields>>>,
  unit: DistanceUnit,
  t: T,
  current: Partial<Pick<Part, "kind" | "installedKm" | "serviceIntervalKm" | "replaceIntervalKm">>,
) {
  return {
    name: current.kind ? partNameToStore(current.kind, input.name, t) : input.name,
    brand: input.brand ?? null,
    model: input.model ?? null,
    installedAt: input.installedAt,
    installedKm: inputToKm(input.installedKm, unit, current.installedKm),
    serviceIntervalKm: input.serviceKm
      ? intervalToKm(input.serviceKm, unit, current.serviceIntervalKm)
      : null,
    serviceIntervalDays: input.serviceMonths ? monthsToDays(input.serviceMonths) : null,
    replaceIntervalKm: input.replaceKm
      ? intervalToKm(input.replaceKm, unit, current.replaceIntervalKm)
      : null,
    replaceIntervalDays: input.replaceMonths ? monthsToDays(input.replaceMonths) : null,
    cost: input.cost ?? null,
  };
}

const updatePartSchema = (t: T) =>
  z.object({ partId: z.coerce.number().int().positive(), ...partFields(t) });

export async function updatePart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = updatePartSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  const input = parsed.data;

  const part = getOwnedPart(user.id, input.partId);
  if (!part) return { ok: false, error: t("common.partNotFound") };

  db.update(parts)
    .set(partValues(input, user.distanceUnit, t, part))
    .where(eq(parts.id, part.id))
    .run();

  revalidateBike(part.bikeId);
  return { ok: true, savedAt: Date.now() };
}

const createPartSchema = (t: T) =>
  z.object({
    bikeId: z.coerce.number().int().positive(),
    category: z.enum(partCategories, { error: t("part.errors.chooseCategory") }),
    ...partFields(t),
  });

export async function createPart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = createPartSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  const input = parsed.data;

  const bike = getOwnedBike(user.id, input.bikeId);
  if (!bike) return { ok: false, error: t("common.bikeNotFound") };

  const part = db.transaction((tx) => {
    // Custom parts go to the end of their category.
    const last = tx
      .select({ order: max(parts.sortOrder) })
      .from(parts)
      .where(and(eq(parts.bikeId, bike.id), eq(parts.category, input.category)))
      .get();

    const created = tx
      .insert(parts)
      .values({
        // The form starts at the bike's odometer.
        ...partValues(input, user.distanceUnit, t, { installedKm: bike.odometerKm }),
        bikeId: bike.id,
        category: input.category,
        kind: "custom",
        sortOrder: (last?.order ?? 0) + 1,
      })
      .returning()
      .get();

    tx.insert(partEvents)
      .values({
        partId: created.id,
        type: "installed",
        date: created.installedAt,
        odometerKm: created.installedKm,
        resetsInterval: true,
      })
      .run();
    bumpOdometer(tx, bike.id, created.installedKm);
    return created;
  });

  revalidateBike(bike.id);
  redirect(`/bikes/${bike.id}/parts/${part.id}`);
}

/** Permanently removes a part and its history, e.g. one the bike doesn't actually have. */
export async function deletePart(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("partId"));
  if (!Number.isInteger(id)) return;

  const part = getOwnedPart(user.id, id);
  if (!part) return;

  db.transaction((tx) => {
    // Unlink any part that pointed to this one as its replacement.
    tx.update(parts)
      .set({ replacedByPartId: null })
      .where(eq(parts.replacedByPartId, part.id))
      .run();
    tx.delete(parts).where(eq(parts.id, part.id)).run();
  });

  revalidateBike(part.bikeId);
  redirect(part.status === "retired" ? `/bikes/${part.bikeId}/history` : `/bikes/${part.bikeId}`);
}
