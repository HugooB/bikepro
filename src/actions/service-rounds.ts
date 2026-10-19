"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceRound } from "@/db/service-rounds";
import type { ActionState } from "@/lib/action-state";
import { serviceActions } from "@/lib/event-types";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const roundSchema = z.object({
  bikeId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  shop: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  odometerKm: z.coerce
    .number({ error: "Enter the odometer in km" })
    .min(0, "Kilometres can't be negative"),
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
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const input = parsed.data;
  if (input.parts.length === 0 && !input.notes && !input.shop) {
    return { ok: false, error: "Select the parts that were serviced, or add a note" };
  }

  try {
    createServiceRound(input);
  } catch {
    return { ok: false, error: "Couldn't save the service round. Please try again." };
  }

  revalidatePath(`/bikes/${input.bikeId}`, "layout");
  return { ok: true, savedAt: Date.now() };
}
