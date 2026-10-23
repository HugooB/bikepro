import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_PREFS, unitsFor, type Units } from "@/lib/units";
import {
  createSession,
  deleteOtherSessions,
  deleteSession,
  validateSession,
  type SessionUser,
} from "@/db/sessions";

export const SESSION_COOKIE = "bikepro_session";

// The database decides when a session ends; the cookie just lives long enough to carry it.
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** Secure cookies need HTTPS; behind a reverse proxy with HTTPS, set APP_URL to https://… */
const secureCookies = () => process.env.APP_URL?.startsWith("https://") ?? false;

/** The signed-in user, or null. Checked once per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSession(token) : null;
});

/** The signed-in user's units and currency, for server components (see lib/units). */
export async function getUnits(): Promise<Units> {
  const user = await getCurrentUser();
  return unitsFor(user ?? DEFAULT_PREFS);
}

/** For pages and server actions that need an account: sends visitors to the sign-in page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signs the user in on this browser with a brand-new session (never reuses an old token). */
export async function startSession(userId: number) {
  const jar = await cookies();
  const old = jar.get(SESSION_COOKIE)?.value;
  if (old) deleteSession(old);
  jar.set(SESSION_COOKIE, createSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

/** Signs the user out on every other device and keeps this browser signed in. */
export async function endOtherSessions(userId: number) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) deleteOtherSessions(userId, token);
}
