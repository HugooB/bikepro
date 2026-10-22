import { z } from "zod";
import { seedAppSetting } from "@/db/app-settings";
import { countUsers, createUser, findUserByEmail, makeAdmin } from "@/db/users";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "./password";

type Env = Record<string, string | undefined>;
type Log = Pick<Console, "info" | "warn">;

/**
 * Runs on start, after the migrations. Creates the admin account from ADMIN_EMAIL and
 * ADMIN_PASSWORD, so nobody else can claim a fresh install, or makes an existing account with
 * that email an admin. ADMIN_PASSWORD is only used to create the account: changing it later
 * doesn't change the admin's password.
 */
export async function bootstrapAccounts(env: Env = process.env, log: Log = console) {
  // Before v0.1.0, ALLOW_REGISTRATION opened registration. Carry its value over once.
  if (env.ALLOW_REGISTRATION !== undefined) {
    seedAppSetting("registrationOpen", env.ALLOW_REGISTRATION === "true");
    log.warn(
      "ALLOW_REGISTRATION is no longer used: an admin opens and closes registration in " +
        "Settings → Admin. You can remove it from your environment.",
    );
  }

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
    if (!existing.isAdmin) {
      makeAdmin(existing.id);
      log.info(`${existing.email} is now an admin (ADMIN_EMAIL).`);
    }
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
