import { z } from "zod";
import type { BikeType, StravaGear } from "@/db/schema";

// Thin client for the few Strava endpoints BikePro uses: OAuth, the athlete's bikes and
// one bike's details. Docs: https://developers.strava.com/docs/reference/

const OAUTH = "https://www.strava.com/oauth";
const API = "https://www.strava.com/api/v3";

/** Bike totals are part of the athlete profile; BikePro never reads activities. */
export const STRAVA_SCOPE = "read,profile:read_all";

export type StravaConfig = { clientId: string; clientSecret: string; redirectUri: string };

/**
 * Null until STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are set. The callback address uses
 * APP_URL, else `origin`; its domain must match the app's "Authorization Callback Domain".
 */
export function stravaConfig(origin = "http://localhost:3000"): StravaConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const base = process.env.APP_URL || origin;
  return { clientId, clientSecret, redirectUri: new URL("/api/strava/callback", base).href };
}

/** Strava answered with an error status. */
export class StravaError extends Error {
  constructor(readonly status: number) {
    super(`Strava answered ${status}`);
  }
}

/** The user revoked BikePro's access (or the tokens are no longer valid): reconnect needed. */
export class StravaRevokedError extends Error {
  constructor() {
    super("Strava access was revoked");
  }
}

async function call<T extends z.ZodType>(url: string, init: RequestInit, schema: T) {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (res.status === 401) throw new StravaRevokedError();
  if (!res.ok) throw new StravaError(res.status);
  return schema.parse(await res.json()) as z.infer<T>;
}

const auth = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` } });

export function authorizeUrl(config: StravaConfig, state: string): string {
  const url = new URL(`${OAUTH}/authorize`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  }).toString();
  return url.href;
}

/** Whether the scopes the user granted (they can untick some) cover what BikePro needs. */
export function hasRequiredScope(granted: string | null): boolean {
  const scopes = new Set((granted ?? "").split(","));
  return STRAVA_SCOPE.split(",").every((s) => scopes.has(s));
}

const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
  athlete: z
    .object({
      id: z.number(),
      firstname: z.string().nullish(),
      lastname: z.string().nullish(),
    })
    .optional(),
});

export type StravaTokens = { accessToken: string; refreshToken: string; expiresAt: Date };

const toTokens = (t: z.infer<typeof tokenSchema>): StravaTokens => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token,
  expiresAt: new Date(t.expires_at * 1000),
});

function tokenRequest(config: StravaConfig, params: Record<string, string>) {
  return call(
    `${OAUTH}/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...params,
      }),
    },
    tokenSchema,
  );
}

/** Trades the code from the OAuth callback for tokens and the athlete who granted them. */
export async function exchangeCode(config: StravaConfig, code: string) {
  const t = await tokenRequest(config, { code, grant_type: "authorization_code" });
  if (!t.athlete) throw new StravaError(502);
  const name = [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ");
  return {
    tokens: toTokens(t),
    athlete: { id: t.athlete.id, name: name || `Athlete ${t.athlete.id}` },
  };
}

/** New tokens; Strava may also issue a new refresh token, which replaces the old one. */
export async function refreshTokens(
  config: StravaConfig,
  refreshToken: string,
): Promise<StravaTokens> {
  try {
    return toTokens(
      await tokenRequest(config, { refresh_token: refreshToken, grant_type: "refresh_token" }),
    );
  } catch (e) {
    // An unknown or revoked refresh token comes back as 400 Bad Request.
    if (e instanceof StravaError && e.status === 400) throw new StravaRevokedError();
    throw e;
  }
}

const athleteSchema = z.object({
  bikes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().nullish(),
        distance: z.number().nullish(),
        primary: z.boolean().nullish(),
        retired: z.boolean().nullish(),
      }),
    )
    .nullish(),
});

/** The athlete's bikes with their total distance. */
export async function getAthleteBikes(accessToken: string): Promise<StravaGear[]> {
  const athlete = await call(`${API}/athlete`, auth(accessToken), athleteSchema);
  return (athlete.bikes ?? []).map((b) => ({
    id: b.id,
    name: b.name?.trim() || "Unnamed bike",
    distanceKm: (b.distance ?? 0) / 1000,
    primary: b.primary ?? false,
    retired: b.retired ?? false,
  }));
}

const gearSchema = z.object({
  brand_name: z.string().nullish(),
  model_name: z.string().nullish(),
  frame_type: z.number().nullish(),
});

// Strava's frame types: 1 mountain, 2 cross, 3 road, 4 time trial, 5 gravel.
const frameTypes: Record<number, BikeType> = {
  1: "other",
  2: "gravel",
  3: "road",
  4: "tt",
  5: "gravel",
};

/** Brand, model and type of one bike, for filling in the add-bike wizard. */
export async function getGearDetails(accessToken: string, gearId: string) {
  const g = await call(`${API}/gear/${encodeURIComponent(gearId)}`, auth(accessToken), gearSchema);
  return {
    brand: g.brand_name?.trim() ?? "",
    model: g.model_name?.trim() ?? "",
    type: g.frame_type ? frameTypes[g.frame_type] : undefined,
  };
}

/** Revokes BikePro's access on Strava's side. */
export async function deauthorize(accessToken: string) {
  await call(
    `${OAUTH}/deauthorize`,
    { method: "POST", body: new URLSearchParams({ access_token: accessToken }) },
    z.unknown(),
  );
}
