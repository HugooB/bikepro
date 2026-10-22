"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnedBike } from "@/db/access";
import {
  deleteStravaConnection,
  linkBikeToStrava,
  StravaLinkError,
  unlinkBikeFromStrava,
} from "@/db/strava";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { deauthorize, stravaConfig } from "@/lib/strava/api";
import { getAccessToken, syncStrava } from "@/lib/strava/sync";

/** Runs when the app is opened; syncs at most once an hour and refreshes the page on news. */
export async function autoSyncStrava() {
  const user = await requireUser();
  const result = await syncStrava(user.id);
  if (result.status === "error" || (result.status === "ok" && result.changed)) {
    revalidatePath("/", "layout");
  }
}

export async function syncStravaNow(): Promise<ActionState> {
  const user = await requireUser();
  const result = await syncStrava(user.id, { manual: true });
  revalidatePath("/", "layout");
  if (result.status === "error") {
    return {
      ok: false,
      error:
        result.error === "revoked"
          ? "Strava no longer gives BikePro access. Connect it again."
          : "Couldn't reach Strava. Try again in a bit.",
    };
  }
  return { ok: true, savedAt: Date.now() };
}

export async function disconnectStrava() {
  const user = await requireUser();
  const config = stravaConfig();
  if (config) {
    // Best effort: revoking on Strava's side can fail (already revoked, offline), but the
    // connection is removed here either way.
    try {
      await deauthorize(await getAccessToken(user.id, config));
    } catch {}
  }
  deleteStravaConnection(user.id);
  revalidatePath("/", "layout");
}

const linkSchema = z.object({
  bikeId: z.coerce.number().int().positive(),
  gearId: z.string().min(1, "Pick a Strava bike").max(40),
  keep: z.enum(["strava", "mine"]).default("strava"),
});

export async function linkStravaBike(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const bike = getOwnedBike(user.id, parsed.data.bikeId);
  if (!bike) return { ok: false, error: "Bike not found" };
  try {
    linkBikeToStrava(bike, parsed.data.gearId, parsed.data.keep === "mine");
  } catch (e) {
    if (e instanceof StravaLinkError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

export async function unlinkStravaBike(formData: FormData) {
  const user = await requireUser();
  const bike = getOwnedBike(user.id, Number(formData.get("bikeId")));
  if (!bike) return;
  unlinkBikeFromStrava(bike.id);
  revalidatePath("/", "layout");
}
