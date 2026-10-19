"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bumpOdometer, recordPartEvent } from "@/db/part-events";
import { partEvents, parts } from "@/db/schema";
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

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Something went wrong";
}

function revalidateBike(bikeId: number, partId: number) {
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/parts/${partId}`);
}

const eventSchema = z.object({
  partId: z.coerce.number().int().positive(),
  type: z.enum(loggableEventTypes, { error: "Choose what you did" }),
  description: optionalText(200),
  date: isoDate,
  odometerKm: z.coerce
    .number({ error: "Enter the odometer in km" })
    .min(0, "Kilometres can't be negative"),
  cost: optionalNumber("Cost"),
  resetsInterval: z.preprocess((v) => v === "on", z.boolean()),
});

export async function addPartEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const part = db.query.parts.findFirst({ where: eq(parts.id, input.partId) }).sync();
  if (!part) return { ok: false, error: "Part not found" };

  db.transaction((tx) => {
    recordPartEvent(tx, part, {
      type: input.type,
      description: input.description,
      date: input.date,
      odometerKm: input.odometerKm,
      cost: input.cost,
      resetsInterval: input.resetsInterval,
    });
    bumpOdometer(tx, part.bikeId, input.odometerKm);
  });

  revalidateBike(part.bikeId, part.id);
  return { ok: true, savedAt: Date.now() };
}

export async function deletePartEvent(formData: FormData) {
  const id = Number(formData.get("eventId"));
  if (!Number.isInteger(id)) return;

  const event = db.query.partEvents.findFirst({ where: eq(partEvents.id, id) }).sync();
  // The "installed" event is the part's origin and is kept; service round events go with their round.
  if (!event || event.type === "installed" || event.serviceRoundId !== null) return;

  const part = db.query.parts.findFirst({ where: eq(parts.id, event.partId) }).sync();
  db.delete(partEvents).where(eq(partEvents.id, id)).run();
  if (part) revalidateBike(part.bikeId, part.id);
}

const partSchema = z.object({
  partId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Give the part a name").max(80),
  brand: optionalText(60),
  model: optionalText(80),
  installedAt: isoDate,
  installedKm: z.coerce
    .number({ error: "Enter the km at installation" })
    .min(0, "Kilometres can't be negative"),
  intervalKm: optionalNumber("Interval km"),
  intervalMonths: optionalNumber("Interval months"),
  cost: optionalNumber("Price"),
});

export async function updatePart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const input = parsed.data;

  const part = db.query.parts.findFirst({ where: eq(parts.id, input.partId) }).sync();
  if (!part) return { ok: false, error: "Part not found" };

  db.update(parts)
    .set({
      name: input.name,
      brand: input.brand ?? null,
      model: input.model ?? null,
      installedAt: input.installedAt,
      installedKm: input.installedKm,
      intervalKm: input.intervalKm ? Math.round(input.intervalKm) : null,
      intervalDays: input.intervalMonths ? monthsToDays(input.intervalMonths) : null,
      cost: input.cost ?? null,
    })
    .where(eq(parts.id, part.id))
    .run();

  revalidateBike(part.bikeId, part.id);
  return { ok: true, savedAt: Date.now() };
}
