"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOwnedBike } from "@/db/access";
import { deleteStravaConnection, linkBikeToStrava, unlinkBikeFromStrava } from "@/db/strava";
import type { T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/auth/next-path";
import { requireUser } from "@/lib/auth/session";
import { authorizeUrl, deauthorize, stravaConfig } from "@/lib/strava/api";
import { startOAuth, withOutcome } from "@/lib/strava/oauth-state";
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

/**
 * Sends the user to Strava to approve BikePro; the form's `next` is where they come back to.
 * A server action (not a link) so only BikePro's own pages can start connecting: Next.js
 * checks the request's Origin for server actions.
 */
export async function connectStrava(formData: FormData) {
  const user = await requireUser();
  const next = formData.get("next");
  const back = safeNextPath(typeof next === "string" ? next : "/settings");
  // Without APP_URL the callback address would come from the request's Host header, which
  // a proxy or a visitor can set. That's fine on a laptop, not on a server.
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    redirect(withOutcome(back, "appUrl"));
  }
  const config = stravaConfig(await requestOrigin());
  if (!config) redirect("/settings");
  const state = await startOAuth(user.id, back);
  redirect(authorizeUrl(config, state));
}

/** The address this request came in on, for development without APP_URL. */
async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function disconnectStrava() {
  const user = await requireUser();
  const config = stravaConfig();
  let revoked = false;
  if (config) {
    // Best effort: revoking on Strava's side can fail (already revoked, offline), but the
    // connection is removed here either way. If it failed, the user is told to revoke it on
    // Strava themselves.
    try {
      await deauthorize(await getAccessToken(user.id, config));
      revoked = true;
    } catch {}
  }
  deleteStravaConnection(user.id);
  revalidatePath("/", "layout");
  if (!revoked) redirect(withOutcome("/settings", "revokeFailed"));
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
  unlinkBikeFromStrava(bike);
  revalidatePath("/", "layout");
}
