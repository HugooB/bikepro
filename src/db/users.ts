import { count, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { bikes, users, type User } from "./schema";

/** A user-facing reason the account couldn't be created. */
export class RegistrationError extends Error {}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Anyone may create the first account, so a fresh install works. After that, registration
 * is open only while ALLOW_REGISTRATION=true.
 */
export function registrationOpen(): boolean {
  if (process.env.ALLOW_REGISTRATION === "true") return true;
  return db.select({ n: count() }).from(users).get()!.n === 0;
}

export function findUserByEmail(email: string): User | undefined {
  return db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .get();
}

/**
 * Creates an account. The first account also takes over the bikes created before accounts
 * existed (those without an owner).
 */
export function createUser(input: { email: string; name: string; passwordHash: string }): User {
  return db.transaction((tx) => {
    const existing = tx.select({ n: count() }).from(users).get()!.n;
    if (existing > 0 && process.env.ALLOW_REGISTRATION !== "true") {
      throw new RegistrationError("Registration is closed. Ask the owner of this BikePro.");
    }
    const email = normalizeEmail(input.email);
    if (tx.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
      throw new RegistrationError("There's already an account with this email. Sign in instead.");
    }

    const user = tx
      .insert(users)
      .values({ email, name: input.name.trim(), passwordHash: input.passwordHash })
      .returning()
      .get();
    if (existing === 0) {
      tx.update(bikes).set({ userId: user.id }).where(isNull(bikes.userId)).run();
    }
    return user;
  });
}
