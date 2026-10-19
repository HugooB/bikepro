"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { bumpOdometer, PartEventError, recordPartEvent } from "@/db/part-events";
import { partCategories, partEvents, parts } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { loggableEventTypes } from "@/lib/event-types";
import { monthsToDays } from "@/lib/format";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const optionalNumber = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .min(0, `${label} can't be negative`)
      .optional(),
  );
const kmField = (label: string) =>
  z.coerce.number({ error: `Enter the ${label}` }).min(0, "Kilometres can't be negative");

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Something went wrong";
}

/** Part pages, the bike page and history all show part data, so refresh the whole bike. */
function revalidateBike(bikeId: number) {
  revalidatePath(`/bikes/${bikeId}`, "layout");
}

const eventSchema = z.object({
  partId: z.coerce.number().int().positive(),
  type: z.enum(loggableEventTypes, { error: "Choose what you did" }),
  description: optionalText(200),
  date: isoDate,
  odometerKm: kmField("odometer in km"),
  cost: optionalNumber("Cost"),
  resetsInterval: z.preprocess((v) => v === "on", z.boolean()),
  newBrand: optionalText(60),
  newModel: optionalText(80),
});

export async function addPartEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const part = db.query.parts.findFirst({ where: eq(parts.id, input.partId) }).sync();
  if (!part) return { ok: false, error: "Part not found" };

  const replacing = input.type === "replaced";
  let newPartId: number | undefined;
  try {
    db.transaction((tx) => {
      const fresh = recordPartEvent(tx, part, {
        type: input.type,
        description: input.description,
        date: input.date,
        odometerKm: input.odometerKm,
        // For a replacement the price belongs to the new part, not the event.
        cost: replacing ? null : input.cost,
        resetsInterval: input.resetsInterval,
        replacement: { brand: input.newBrand, model: input.newModel, cost: input.cost },
      });
      newPartId = fresh?.id;
      bumpOdometer(tx, part.bikeId, input.odometerKm);
    });
  } catch (e) {
    if (e instanceof PartEventError) return { ok: false, error: e.message };
    throw e;
  }

  revalidateBike(part.bikeId);
  // The old part is now retired, so continue on the page of the one that replaced it.
  if (newPartId) redirect(`/bikes/${part.bikeId}/parts/${newPartId}?replaced=1`);
  return { ok: true, savedAt: Date.now() };
}

export async function deletePartEvent(formData: FormData) {
  const id = Number(formData.get("eventId"));
  if (!Number.isInteger(id)) return;

  const event = db.query.partEvents
    .findFirst({ where: eq(partEvents.id, id), with: { part: true } })
    .sync();
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

const partFields = {
  name: z.string().trim().min(1, "Give the part a name").max(80),
  brand: optionalText(60),
  model: optionalText(80),
  installedAt: isoDate,
  installedKm: kmField("km at installation"),
  intervalKm: optionalNumber("Interval km"),
  intervalMonths: optionalNumber("Interval months"),
  cost: optionalNumber("Price"),
};

function partValues(input: z.infer<z.ZodObject<typeof partFields>>) {
  return {
    name: input.name,
    brand: input.brand ?? null,
    model: input.model ?? null,
    installedAt: input.installedAt,
    installedKm: input.installedKm,
    intervalKm: input.intervalKm ? Math.round(input.intervalKm) : null,
    intervalDays: input.intervalMonths ? monthsToDays(input.intervalMonths) : null,
    cost: input.cost ?? null,
  };
}

const updatePartSchema = z.object({ partId: z.coerce.number().int().positive(), ...partFields });

export async function updatePart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updatePartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const part = db.query.parts.findFirst({ where: eq(parts.id, input.partId) }).sync();
  if (!part) return { ok: false, error: "Part not found" };

  db.update(parts).set(partValues(input)).where(eq(parts.id, part.id)).run();

  revalidateBike(part.bikeId);
  return { ok: true, savedAt: Date.now() };
}

const createPartSchema = z.object({
  bikeId: z.coerce.number().int().positive(),
  category: z.enum(partCategories, { error: "Choose a category" }),
  ...partFields,
});

export async function createPart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createPartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const bike = db.query.bikes.findFirst({ where: (b, { eq }) => eq(b.id, input.bikeId) }).sync();
  if (!bike) return { ok: false, error: "Bike not found" };

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
        ...partValues(input),
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
  const id = Number(formData.get("partId"));
  if (!Number.isInteger(id)) return;

  const part = db.query.parts.findFirst({ where: eq(parts.id, id) }).sync();
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
