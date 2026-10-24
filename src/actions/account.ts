"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { importData } from "@/db/import";
import { distanceUnits } from "@/db/schema";
import type { SessionUser } from "@/db/sessions";
import { getStravaConnection } from "@/db/strava";
import { deleteAccount, findUserByEmail, setPasswordHash, setPreferences } from "@/db/users";
import { isLocale, type Locale, type T } from "@/i18n";
import { getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { hashPassword, newPasswordSchema, PASSWORD_MAX, verifyPassword } from "@/lib/auth/password";
import { endOtherSessions, endSession, requireUser } from "@/lib/auth/session";
import { clearFailures, isThrottled, recordFailure } from "@/lib/auth/throttle";
import { deauthorize, stravaConfig } from "@/lib/strava/api";
import { getAccessToken } from "@/lib/strava/sync";
import { isCurrency } from "@/lib/units";
import { UserError } from "@/lib/user-error";

const currentPassword = (t: T) =>
  z.string().min(1, t("account.errors.enterCurrentPassword")).max(PASSWORD_MAX);

/**
 * Checks the signed-in user's password. Wrong guesses count towards the same limit as
 * sign-ins, so a session left open somewhere can't be used to guess the password.
 */
async function checkPassword(user: SessionUser, password: string, t: T): Promise<string | null> {
  if (isThrottled(user.email)) return t("account.errors.throttled");
  const account = findUserByEmail(user.email);
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    recordFailure(user.email);
    return t("account.errors.wrongPassword");
  }
  clearFailures(user.email);
  return null;
}

const changePasswordSchema = (t: T) =>
  z
    .object({ current: currentPassword(t), password: newPasswordSchema(t), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: t("account.errors.passwordsDiffer") });

/** Settings → Account. Signs out every other device; this one stays signed in. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = changePasswordSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const wrong = await checkPassword(user, parsed.data.current, t);
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
  const t = await getT();
  if (user.isAdmin) return { ok: false, error: t("errors.adminCantBeDeleted") };
  const parsed = currentPassword(t).safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };

  const wrong = await checkPassword(user, parsed.data, t);
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
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars) };
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
  const t = await getT();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: t("errors.importChooseFile") };
  }
  if (file.size > IMPORT_MAX_BYTES) return { ok: false, error: t("errors.importTooLarge") };

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: t("errors.importNotExport") };
  }

  let summary;
  try {
    summary = importData(user.id, data);
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars) };
    throw e;
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    savedAt: Date.now(),
    message: t("settings.data.imported", {
      bikes: t("settings.data.bikes", { count: summary.bikes }),
      parts: t("settings.data.parts", { count: summary.parts }),
      events: t("settings.data.events", { count: summary.events }),
    }),
  };
}

const preferencesSchema = (t: T) =>
  z.object({
    distanceUnit: z.enum(distanceUnits, { error: t("settings.preferences.errors.unit") }),
    currency: z.string().refine(isCurrency, t("settings.preferences.errors.currency")),
    locale: z.custom<Locale>(isLocale, t("settings.preferences.errors.language")),
  });

/** Settings → Preferences. Only changes how values are shown and entered, never the values. */
export async function updatePreferences(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const t = await getT();
  const parsed = preferencesSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  setPreferences(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
