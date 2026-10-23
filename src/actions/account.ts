"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { importData, ImportError } from "@/db/import";
import { getStravaConnection } from "@/db/strava";
import { AccountError, deleteAccount, findUserByEmail, setPasswordHash } from "@/db/users";
import { firstError, type ActionState } from "@/lib/action-state";
import { hashPassword, newPasswordSchema, PASSWORD_MAX, verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/db/sessions";
import { endOtherSessions, endSession, requireUser } from "@/lib/auth/session";
import { clearFailures, isThrottled, recordFailure } from "@/lib/auth/throttle";
import { deauthorize, stravaConfig } from "@/lib/strava/api";
import { getAccessToken } from "@/lib/strava/sync";

const currentPassword = z.string().min(1, "Enter your current password").max(PASSWORD_MAX);

/**
 * Checks the signed-in user's password. Wrong guesses count towards the same limit as
 * sign-ins, so a session left open somewhere can't be used to guess the password.
 */
async function checkPassword(user: SessionUser, password: string): Promise<string | null> {
  if (isThrottled(user.email)) return "Too many wrong passwords. Try again in 15 minutes.";
  const account = findUserByEmail(user.email);
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    recordFailure(user.email);
    return "Your current password is incorrect";
  }
  clearFailures(user.email);
  return null;
}

const changePasswordSchema = z
  .object({ current: currentPassword, password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The new passwords don't match" });

/** Settings → Account. Signs out every other device; this one stays signed in. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const wrong = await checkPassword(user, parsed.data.current);
  if (wrong) return { ok: false, error: wrong };

  setPasswordHash(user.id, await hashPassword(parsed.data.password));
  await endOtherSessions(user.id);
  return { ok: true, savedAt: Date.now() };
}

/** Settings → Account → Delete account. Removes the account and everything in it. */
export async function deleteMyAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.isAdmin) return { ok: false, error: "The admin account can't be deleted." };
  const parsed = currentPassword.safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const wrong = await checkPassword(user, parsed.data);
  if (wrong) return { ok: false, error: wrong };

  const config = stravaConfig();
  if (config && getStravaConnection(user.id)) {
    // Best effort, as when disconnecting: the account is deleted even if Strava can't be reached.
    try {
      await deauthorize(await getAccessToken(user.id, config));
    } catch {}
  }

  try {
    deleteAccount(user.id);
  } catch (e) {
    if (e instanceof AccountError) return { ok: false, error: e.message };
    throw e;
  }
  await endSession();
  redirect("/login?deleted=1");
}

/** Larger than any real export; the server action body limit in next.config.ts is just above. */
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/** Settings → Your data. Adds the bikes from a JSON export to this account. */
export async function importMyData(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a BikePro export (.json) first" };
  }
  if (file.size > IMPORT_MAX_BYTES) return { ok: false, error: "That file is too large" };

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "This file isn't a BikePro export." };
  }

  let summary;
  try {
    summary = importData(user.id, data);
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  return {
    ok: true,
    savedAt: Date.now(),
    message: `Imported ${n(summary.bikes, "bike")}, ${n(summary.parts, "part")} and ${n(summary.events, "event")}`,
  };
}
