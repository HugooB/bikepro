"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnedBike } from "@/db/access";
import { deleteStravaConnection, linkBikeToStrava, unlinkBikeFromStrava } from "@/db/strava";
import type { T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { deauthorize, stravaConfig } from "@/lib/strava/api";
import { getAccessToken, syncStrava } from "@/lib/strava/sync";
import { UserError } from "@/lib/user-error";

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
  const t = await getT();
  const result = await syncStrava(user.id, { manual: true });
  revalidatePath("/", "layout");
  if (result.status === "error") {
    return {
      ok: false,
      error:
        result.error === "revoked" ? t("strava.errors.revoked") : t("strava.errors.unreachable"),
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

const linkSchema = (t: T) =>
  z.object({
    bikeId: z.coerce.number().int().positive(),
    gearId: z.string().min(1, t("strava.errors.pickBike")).max(40),
    keep: z.enum(["strava", "mine"]).default("strava"),
  });

export async function linkStravaBike(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = linkSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const bike = getOwnedBike(user.id, parsed.data.bikeId);
  if (!bike) return { ok: false, error: t("common.bikeNotFound") };
  try {
    linkBikeToStrava(bike, parsed.data.gearId, parsed.data.keep === "mine");
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars) };
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
