import {
  applyStravaGear,
  claimStravaSync,
  getStravaConnection,
  markStravaSyncFailed,
  readTokens,
  updateStravaTokens,
} from "@/db/strava";
import {
  getAthleteBikes,
  refreshTokens,
  stravaConfig,
  StravaRevokedError,
  type StravaConfig,
} from "./api";

const MINUTE = 60 * 1000;
/** Opening the app syncs at most this often. */
export const AUTO_SYNC_INTERVAL = 60 * MINUTE;
/** "Sync now" still waits this long between calls, against double clicks. */
const MANUAL_SYNC_INTERVAL = 10 * 1000;

export type SyncResult =
  | { status: "skipped" }
  | { status: "ok"; changed: boolean }
  | { status: "error"; error: "revoked" | "failed" };

/** Whether opening the app now should start a sync for this connection. */
export function syncDue(c: { syncAttemptAt: Date | null }, now = Date.now()) {
  return !c.syncAttemptAt || now - c.syncAttemptAt.getTime() >= AUTO_SYNC_INTERVAL;
}

/** An access token for the user's connection, refreshed first when it (nearly) expired. */
export async function getAccessToken(userId: number, config: StravaConfig): Promise<string> {
  const connection = getStravaConnection(userId);
  if (!connection) throw new StravaRevokedError();
  let tokens;
  try {
    tokens = readTokens(connection);
  } catch {
    // Encrypted with another STRAVA_CLIENT_SECRET: only a reconnect helps.
    throw new StravaRevokedError();
  }
  if (tokens.expiresAt.getTime() - Date.now() > 5 * MINUTE) return tokens.accessToken;

  const fresh = await refreshTokens(config, tokens.refreshToken);
  updateStravaTokens(userId, fresh);
  return fresh.accessToken;
}

/**
 * Fetches the user's Strava bikes and updates the odometers of linked bikes. Never throws:
 * a failed sync is recorded on the connection and shown in Settings.
 */
export async function syncStrava(userId: number, { manual = false } = {}): Promise<SyncResult> {
  const config = stravaConfig();
  if (!config || !getStravaConnection(userId)) return { status: "skipped" };
  if (!claimStravaSync(userId, manual ? MANUAL_SYNC_INTERVAL : AUTO_SYNC_INTERVAL)) {
    return { status: "skipped" };
  }

  try {
    const gear = await getAthleteBikes(await getAccessToken(userId, config));
    return { status: "ok", changed: applyStravaGear(userId, gear) };
  } catch (e) {
    const error = e instanceof StravaRevokedError ? "revoked" : "failed";
    if (error === "failed") console.error("Strava sync failed", e);
    markStravaSyncFailed(userId, error);
    return { status: "error", error };
  }
}
