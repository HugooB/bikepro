"use server";

import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getOwnedBike } from "@/db/access";
import { createBike, setOdometer } from "@/db/bikes";
import { bikes } from "@/db/schema";
import { findLinkableGear } from "@/db/strava";
import type { T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { dateField } from "@/lib/dates";
import { UserError } from "@/lib/user-error";
import { inputToKm, toInput } from "@/lib/units";
import {
  basicsSchema,
  distanceField,
  optionalPrice,
  planBike,
  WizardDraftError,
  type WizardDraft,
  type WizardStep,
} from "@/lib/wizard-schema";

const odometerSchema = (t: T) =>
  z.object({
    bikeId: z.coerce.number().int().positive(),
    /** In the user's distance unit. */
    odometerKm: distanceField(t, t("validation.enterOdometer")),
  });

export async function updateOdometer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = odometerSchema(t).safeParse({
    bikeId: formData.get("bikeId"),
    odometerKm: formData.get("odometerKm"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const { bikeId, odometerKm } = parsed.data;
  const bike = getOwnedBike(user.id, bikeId);
  if (!bike) return { ok: false, error: t("common.bikeNotFound") };
  const km = inputToKm(odometerKm, user.distanceUnit, bike.odometerKm);
  db.transaction((tx) => setOdometer(tx, bike, km));
  revalidatePath(`/bikes/${bikeId}`);
  return { ok: true, savedAt: Date.now() };
}

export type CreateBikeResult =
  { ok: true; bikeId: number } | { ok: false; error: string; step?: WizardStep };

/** Last step of the add-bike wizard: creates the bike, its parts and their install events. */
export async function createBikeFromWizard(draft: WizardDraft): Promise<CreateBikeResult> {
  const user = await requireUser();
  const t = await getT();
  const today = format(new Date(), "yyyy-MM-dd");
  let bike;
  try {
    bike = db.transaction((tx) => {
      // A bike linked to Strava starts at its Strava total, whatever the browser sent.
      const gear = draft.stravaGearId ? findLinkableGear(user.id, draft.stravaGearId) : null;
      const plan = planBike(
        gear ? { ...draft, odometerKm: String(toInput(gear.distanceKm, draft.unit)) } : draft,
        today,
        t,
      );
      if (gear) {
        // Exactly Strava's total, not the rounded figure the wizard showed.
        plan.bike = {
          ...plan.bike,
          odometerKm: gear.distanceKm,
          stravaGearId: gear.id,
          stravaDistanceKm: gear.distanceKm,
        };
      }
      return createBike(tx, plan, user.id, t);
    });
  } catch (e) {
    if (e instanceof WizardDraftError) return { ok: false, error: e.message, step: e.step };
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars), step: "odometer" };
    throw e;
  }
  // The header's bike switcher is part of the root layout.
  revalidatePath("/", "layout");
  return { ok: true, bikeId: bike.id };
}

const bikeSchema = (t: T) =>
  basicsSchema(t).extend({
    bikeId: z.coerce.number().int().positive(),
    purchasedAt: z.union([z.literal(""), dateField(t)]),
    purchasePrice: optionalPrice(t),
  });

export async function updateBike(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = bikeSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const {
    bikeId,
    name,
    type,
    brakeType,
    tireType,
    brand,
    model,
    color,
    purchasedAt,
    purchasePrice,
  } = parsed.data;
  if (!getOwnedBike(user.id, bikeId)) return { ok: false, error: t("common.bikeNotFound") };
  db.update(bikes)
    .set({
      name,
      type,
      brakeType,
      tireType,
      brand: brand || null,
      model: model || null,
      color: color || null,
      purchasedAt: purchasedAt || null,
      purchasePrice: purchasePrice ?? null,
    })
    .where(eq(bikes.id, bikeId))
    .run();
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

/** Archived bikes keep their data but leave the switcher; they can be restored in Settings. */
export async function setBikeArchived(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("bikeId"));
  if (!Number.isInteger(id)) return;
  const archived = formData.get("archived") === "true";

  db.update(bikes)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(bikes.id, id), eq(bikes.userId, user.id)))
    .run();
  revalidatePath("/", "layout");
}
