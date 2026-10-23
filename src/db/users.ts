import { asc, count, eq, isNull } from "drizzle-orm";
import { getAppSetting, setAppSetting } from "./app-settings";
import { db } from "./index";
import { bikes, sessions, users, type DistanceUnit, type User } from "./schema";

/** A user-facing reason the account couldn't be created. */
export class RegistrationError extends Error {}

/** A user-facing reason an account change was refused. */
export class AccountError extends Error {}

/** Thrown when someone who isn't an admin tries to change the install's settings. */
export class NotAdminError extends Error {
  constructor() {
    super("Only an admin can do that");
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Anyone may create the first account, so a fresh install works (set ADMIN_EMAIL to create it
 * on start instead). After that, registration is open only while an admin has opened it.
 */
export function registrationOpen(): boolean {
  return countUsers() === 0 || getAppSetting("registrationOpen");
}

export function countUsers(): number {
  return db.select({ n: count() }).from(users).get()!.n;
}

export function findUserByEmail(email: string): User | undefined {
  return db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .get();
}

/**
 * Creates an account. While the install has no admin, the new account becomes one. The first
 * account also takes over the bikes created before accounts existed (those without an owner).
 * `bootstrap` creates the admin from ADMIN_EMAIL, whether or not registration is open.
 */
export function createUser(
  input: { email: string; name: string; passwordHash: string },
  { bootstrap = false } = {},
): User {
  return db.transaction((tx) => {
    const existing = tx.select({ n: count() }).from(users).get()!.n;
    if (!bootstrap && !registrationOpen()) {
      throw new RegistrationError("Registration is closed. Ask the owner of this BikePro.");
    }
    const email = normalizeEmail(input.email);
    if (tx.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
      throw new RegistrationError("There's already an account with this email. Sign in instead.");
    }
    const hasAdmin = !!tx.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).get();

    const user = tx
      .insert(users)
      .values({
        email,
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        isAdmin: bootstrap || !hasAdmin,
      })
      .returning()
      .get();
    if (existing === 0) {
      tx.update(bikes).set({ userId: user.id }).where(isNull(bikes.userId)).run();
    }
    return user;
  });
}

export function makeAdmin(userId: number) {
  db.update(users).set({ isAdmin: true }).where(eq(users.id, userId)).run();
}

function isAdmin(userId: number): boolean {
  return !!db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).get()
    ?.isAdmin;
}

/** Opens or closes registration for new accounts. Only an admin may do this. */
export function setRegistrationOpen(actorId: number, open: boolean) {
  if (!isAdmin(actorId)) throw new NotAdminError();
  setAppSetting("registrationOpen", open);
}

/** Every account on this install, oldest first, for the admin's user list. */
export function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.id))
    .all();
}

/** How the user sees distances and amounts. Stored values never change with it. */
export function setPreferences(
  userId: number,
  prefs: { distanceUnit: DistanceUnit; currency: string },
) {
  db.update(users).set(prefs).where(eq(users.id, userId)).run();
}

export function setPasswordHash(userId: number, passwordHash: string) {
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}

/**
 * An admin sets a temporary password for someone else and signs them out everywhere. Admins
 * change their own password under Settings → Account instead.
 */
export function resetPassword(actorId: number, targetId: number, passwordHash: string): User {
  if (!isAdmin(actorId)) throw new NotAdminError();
  if (actorId === targetId) throw new AccountError("Change your own password under Account.");
  return db.transaction((tx) => {
    const target = tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, targetId))
      .returning()
      .get();
    if (!target) throw new AccountError("That account no longer exists.");
    tx.delete(sessions).where(eq(sessions.userId, targetId)).run();
    return target;
  });
}

/**
 * Deletes the account and everything in it. Bikes have no foreign key to their owner, so
 * they're removed here; their parts, events and service rounds go with them, and the
 * sessions and Strava connection go with the user. An admin can't delete their account,
 * since the install would be left without one.
 */
export function deleteAccount(userId: number) {
  db.transaction((tx) => {
    const user = tx
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!user) return;
    if (user.isAdmin) throw new AccountError("The admin account can't be deleted.");
    tx.delete(bikes).where(eq(bikes.userId, userId)).run();
    tx.delete(users).where(eq(users.id, userId)).run();
  });
}
