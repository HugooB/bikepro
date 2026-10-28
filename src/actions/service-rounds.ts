"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getOwnedBike, getOwnedServiceRound } from "@/db/access";
import { serviceRounds } from "@/db/schema";
import { PartEventError } from "@/db/part-events";
import { createServiceRound } from "@/db/service-rounds";
import type { T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { dateField } from "@/lib/dates";
import { serviceActions } from "@/lib/event-types";
import { inputToKm } from "@/lib/units";
import { UserError } from "@/lib/user-error";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const roundSchema = (t: T) => {
  const cost = t("validation.labels.cost");
  return z.object({
    bikeId: z.coerce.number().int().positive(),
    date: dateField(t),
    shop: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
    /** In the user's distance unit. */
    odometerKm: z.coerce
      .number({ error: t("validation.enterOdometer") })
      .min(0, t("validation.distanceNegative")),
    totalCost: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ error: t("validation.mustBeNumber", { label: cost }) })
        .min(0, t("validation.cannotBeNegative", { label: cost }))
        .optional(),
    ),
    notes: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional()),
    parts: z.array(
      z.object({
        partId: z.coerce.number().int().positive(),
        type: z.enum(serviceActions),
        note: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
      }),
    ),
  });
};

/**
 * Form fields: bikeId, date, shop, odometerKm, totalCost, notes, plus for each covered part a
 * `partId` checkbox value with `action-<id>` and `note-<id>`.
 */
export async function saveServiceRound(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const partIds = formData.getAll("partId").map(String);
  const parsed = roundSchema(t).safeParse({
    bikeId: formData.get("bikeId"),
    date: formData.get("date"),
    shop: formData.get("shop"),
    odometerKm: formData.get("odometerKm"),
    totalCost: formData.get("totalCost"),
    notes: formData.get("notes"),
    parts: partIds.map((id) => ({
      partId: id,
      type: formData.get(`action-${id}`) ?? "serviced",
      note: formData.get(`note-${id}`),
    })),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const bike = getOwnedBike(user.id, parsed.data.bikeId);
  if (!bike) return { ok: false, error: t("common.bikeNotFound") };
  // The form starts at the bike's odometer; left as it is, that reading is kept exactly.
  const input = {
    ...parsed.data,
    odometerKm: inputToKm(parsed.data.odometerKm, user.distanceUnit, bike.odometerKm),
  };
  if (input.parts.length === 0 && !input.notes && !input.shop) {
    return { ok: false, error: t("serviceRound.errors.nothingSelected") };
  }

  try {
    createServiceRound(input, t);
  } catch (e) {
    if (e instanceof UserError) {
      const errorPartId = e instanceof PartEventError ? e.partId : undefined;
      return { ok: false, error: t(e.key, e.vars), errorPartId };
    }
    return { ok: false, error: t("serviceRound.errors.saveFailed") };
  }

  revalidatePath(`/bikes/${input.bikeId}`, "layout");
  return { ok: true, savedAt: Date.now() };
}

/** Deletes a service round and the part events it logged. Replaced parts stay replaced. */
export async function deleteServiceRound(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("serviceRoundId"));
  if (!Number.isInteger(id)) return;

  const round = getOwnedServiceRound(user.id, id);
  if (!round) return;

  db.delete(serviceRounds).where(eq(serviceRounds.id, id)).run();
  revalidatePath(`/bikes/${round.bikeId}`, "layout");
}
