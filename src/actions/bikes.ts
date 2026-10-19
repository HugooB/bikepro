"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bikes } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";

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
