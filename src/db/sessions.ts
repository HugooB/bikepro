import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n";
import { db } from "./index";
import { sessions, users, type DistanceUnit } from "./schema";

const DAY = 24 * 60 * 60 * 1000;
/** A session ends after this long without use. */
export const SESSION_TTL = 30 * DAY;

// Only a hash of the token is stored, so a copy of the database can't be used to sign in.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a session and returns its token, which goes in the user's cookie. */
export function createSession(userId: number, now = new Date()): string {
  const token = randomBytes(32).toString("base64url");
  db.insert(sessions)
    .values({ id: hashToken(token), userId, expiresAt: new Date(now.getTime() + SESSION_TTL) })
    .run();
  return token;
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  distanceUnit: DistanceUnit;
  currency: string;
  locale: Locale;
};

/**
 * The signed-in user for a session token, or null. Expired sessions are removed; active ones
 * are extended once less than half their time is left.
 */
export function validateSession(token: string, now = new Date()): SessionUser | null {
  const id = hashToken(token);
  const row = db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        distanceUnit: users.distanceUnit,
        currency: users.currency,
        locale: users.locale,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;

  if (row.expiresAt.getTime() <= now.getTime()) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  if (row.expiresAt.getTime() - now.getTime() < SESSION_TTL / 2) {
    db.update(sessions)
      .set({ expiresAt: new Date(now.getTime() + SESSION_TTL) })
      .where(eq(sessions.id, id))
      .run();
  }
  // A language that was removed since it was picked falls back to the default.
  return { ...row.user, locale: isLocale(row.user.locale) ? row.user.locale : DEFAULT_LOCALE };
}

export function deleteSession(token: string) {
  db.delete(sessions)
    .where(eq(sessions.id, hashToken(token)))
    .run();
}

/** Signs the user out on every device. */
export function deleteUserSessions(userId: number) {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

/** Signs the user out everywhere except the session with this token, e.g. after a password change. */
export function deleteOtherSessions(userId: number, keepToken: string) {
  db.delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, hashToken(keepToken))))
    .run();
}
