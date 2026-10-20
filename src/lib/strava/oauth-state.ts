import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/next-path";

// The OAuth `state` ties Strava's callback to the browser that started connecting: without
// it, someone could send a signed-in user a callback link that connects the wrong account.

const STATE_COOKIE = "bikepro_strava_state";

/** Starts a connect attempt; returns the state to send to Strava. */
export async function startOAuth(back: string): Promise<string> {
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, back: safeNextPath(back) }), {
    httpOnly: true,
    // Lax still sends it on the top-level redirect back from strava.com.
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/api/strava",
    maxAge: 10 * 60,
  });
  return state;
}

/** Ends a connect attempt: where to send the user back to, and whether `state` matched. */
export async function finishOAuth(state: string | null): Promise<{ back: string; ok: boolean }> {
  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/strava" });
  try {
    const saved = JSON.parse(raw ?? "");
    const back = safeNextPath(saved.back);
    const a = Buffer.from(String(saved.state));
    const b = Buffer.from(state ?? "");
    return { back, ok: a.length === b.length && timingSafeEqual(a, b) };
  } catch {
    return { back: "/settings", ok: false };
  }
}

/** `back` with ?strava=<outcome>, which the page turns into a message. */
export function withOutcome(back: string, outcome: string): string {
  const url = new URL(back, "http://bikepro.invalid");
  url.searchParams.set("strava", outcome);
  return url.pathname + url.search;
}
