"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getOwnedBike, getOwnedServiceRound } from "@/db/access";
import { PartEventError } from "@/db/part-events";
import { serviceRounds } from "@/db/schema";
import { createServiceRound } from "@/db/service-rounds";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { isoDate } from "@/lib/dates";
import { serviceActions } from "@/lib/event-types";
import { inputToKm } from "@/lib/units";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const roundSchema = z.object({
  bikeId: z.coerce.number().int().positive(),
  date: isoDate,
  shop: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  /** In the user's distance unit. */
  odometerKm: z.coerce
    .number({ error: "Enter the odometer" })
    .min(0, "Distances can't be negative"),
  totalCost: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: "Cost must be a number" }).min(0, "Cost can't be negative").optional(),
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

/**
 * Form fields: bikeId, date, shop, odometerKm, totalCost, notes, plus for each covered part a
 * `partId` checkbox value with `action-<id>` and `note-<id>`.
 */
export async function saveServiceRound(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const partIds = formData.getAll("partId").map(String);
  const parsed = roundSchema.safeParse({
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
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const bike = getOwnedBike(user.id, parsed.data.bikeId);
  if (!bike) return { ok: false, error: "Bike not found" };
  // The form starts at the bike's odometer; left as it is, that reading is kept exactly.
  const input = {
    ...parsed.data,
    odometerKm: inputToKm(parsed.data.odometerKm, user.distanceUnit, bike.odometerKm),
  };
  if (input.parts.length === 0 && !input.notes && !input.shop) {
    return { ok: false, error: "Select the parts that were serviced, or add a note" };
  }

  try {
    createServiceRound(input);
  } catch (e) {
    if (e instanceof PartEventError) return { ok: false, error: e.message };
    return { ok: false, error: "Couldn't save the service round. Please try again." };
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
