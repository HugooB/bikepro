"use server";

import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { createBike } from "@/db/bikes";
import { bikes } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { isoDate } from "@/lib/dates";
import {
  basicsSchema,
  planBike,
  WizardDraftError,
  type WizardDraft,
  type WizardStep,
} from "@/lib/wizard-schema";

const odometerSchema = z.object({
  bikeId: z.coerce.number().int().positive(),
  odometerKm: z.coerce
    .number({ error: "Enter a number" })
    .min(0, "Kilometres can't be negative")
    .max(1_000_000, "That's a lot of kilometres"),
});

export async function updateOdometer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = odometerSchema.safeParse({
    bikeId: formData.get("bikeId"),
    odometerKm: formData.get("odometerKm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { bikeId, odometerKm } = parsed.data;
  db.update(bikes).set({ odometerKm }).where(eq(bikes.id, bikeId)).run();
  revalidatePath(`/bikes/${bikeId}`);
  return { ok: true, savedAt: Date.now() };
}

export type CreateBikeResult =
  { ok: true; bikeId: number } | { ok: false; error: string; step?: WizardStep };

/** Last step of the add-bike wizard: creates the bike, its parts and their install events. */
export async function createBikeFromWizard(draft: WizardDraft): Promise<CreateBikeResult> {
  let plan;
  try {
    plan = planBike(draft, format(new Date(), "yyyy-MM-dd"));
  } catch (e) {
    if (e instanceof WizardDraftError) return { ok: false, error: e.message, step: e.step };
    throw e;
  }

  const bike = db.transaction((tx) => createBike(tx, plan));
  // The header's bike switcher is part of the root layout.
  revalidatePath("/", "layout");
  return { ok: true, bikeId: bike.id };
}

const bikeSchema = basicsSchema.extend({
  bikeId: z.coerce.number().int().positive(),
  purchasedAt: z.union([z.literal(""), isoDate]),
});

export async function updateBike(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bikeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { bikeId, name, type, brand, model, color, purchasedAt } = parsed.data;
  db.update(bikes)
    .set({
      name,
      type,
      brand: brand || null,
      model: model || null,
      color: color || null,
      purchasedAt: purchasedAt || null,
    })
    .where(eq(bikes.id, bikeId))
    .run();
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

/** Archived bikes keep their data but leave the switcher; they can be restored in Settings. */
export async function setBikeArchived(formData: FormData) {
  const id = Number(formData.get("bikeId"));
  if (!Number.isInteger(id)) return;
  const archived = formData.get("archived") === "true";

  db.update(bikes)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(bikes.id, id))
    .run();
  revalidatePath("/", "layout");
}
