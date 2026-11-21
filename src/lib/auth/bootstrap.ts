import { z } from "zod";
import { countUsers, createUser, findUserByEmail, hasAdmin, makeAdmin } from "@/db/users";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "./password";

type Env = Record<string, string | undefined>;
type Log = Pick<Console, "info" | "warn">;

/**
 * Runs on start. In production BikePro needs APP_URL: without it the sign-in cookie isn't
 * HTTPS-only, there's no HSTS, and Strava can't be connected (its callback address would come
 * from the request's Host header). Nothing stops, but the log says so.
 */
export function checkAppUrl(env: Env = process.env, log: Log = console) {
  if (env.NODE_ENV !== "production" || env.APP_URL) return;
  log.warn(
    "APP_URL isn't set. Set it to the address you open BikePro on (https://… behind HTTPS): " +
      "without it the sign-in cookie isn't HTTPS-only and Strava can't be connected.",
  );
}

/**
 * Runs on start, after the migrations. Creates the admin account from ADMIN_EMAIL and
 * ADMIN_PASSWORD, so nobody else can claim a fresh install. An existing account with that email
 * becomes the admin only while the install has none: registration doesn't prove someone owns
 * an email, so otherwise anyone could register it and wait to be promoted. ADMIN_PASSWORD is
 * only used to create the account: changing it later doesn't change the admin's password.
 */
export async function bootstrapAccounts(env: Env = process.env, log: Log = console) {
  const email = env.ADMIN_EMAIL?.trim();
  if (!email) {
    if (countUsers() === 0) {
      log.warn(
        "ADMIN_EMAIL isn't set, so the first person to open BikePro creates the admin " +
          "account. Set ADMIN_EMAIL and ADMIN_PASSWORD before making BikePro reachable.",
      );
    }
    return;
  }
  if (!z.email().safeParse(email).success) {
    throw new Error(`ADMIN_EMAIL "${email}" isn't a valid email address`);
  }

  const existing = findUserByEmail(email);
  if (existing) {
    if (existing.isAdmin) return;
    if (hasAdmin()) {
      log.warn(
        `ADMIN_EMAIL is ${existing.email}, which belongs to an account that isn't an admin. ` +
          "It isn't made one, because this install already has an admin.",
      );
      return;
    }
    makeAdmin(existing.id);
    log.info(`${existing.email} is now an admin (ADMIN_EMAIL).`);
    return;
  }

  const password = env.ADMIN_PASSWORD ?? "";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new Error(
      `Set ADMIN_PASSWORD (${PASSWORD_MIN} to ${PASSWORD_MAX} characters) to create the ` +
        `admin account ${email}`,
    );
  }
  const admin = createUser(
    { email, name: env.ADMIN_NAME?.trim() || "Admin", passwordHash: await hashPassword(password) },
    { bootstrap: true },
  );
  log.info(`Created the admin account ${admin.email}.`);
}
