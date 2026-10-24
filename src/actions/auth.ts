"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { deleteUserSessions } from "@/db/sessions";
import { createUser, findUserByEmail, normalizeEmail } from "@/db/users";
import type { T } from "@/i18n";
import { browserLocale, getT } from "@/i18n/server";
import { firstError, type ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/auth/next-path";
import {
  burnPasswordCheck,
  hashPassword,
  newPasswordSchema,
  PASSWORD_MAX,
  verifyPassword,
} from "@/lib/auth/password";
import { endSession, requireUser, startSession } from "@/lib/auth/session";
import { clearFailures, isThrottled, recordFailure } from "@/lib/auth/throttle";
import { UserError } from "@/lib/user-error";

const email = (t: T) => z.email(t("auth.errors.invalidEmail")).max(254);

const loginSchema = (t: T) =>
  z.object({
    email: email(t),
    password: z.string().min(1, t("auth.errors.enterPassword")).max(PASSWORD_MAX),
    next: z.string().optional(),
  });

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const parsed = loginSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  const input = parsed.data;

  const key = normalizeEmail(input.email);
  if (isThrottled(key)) return { ok: false, error: t("auth.errors.throttled") };

  const user = findUserByEmail(input.email);
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await burnPasswordCheck(input.password), false);
  if (!user || !valid) {
    recordFailure(key);
    return { ok: false, error: t("auth.errors.signInFailed") };
  }

  clearFailures(key);
  await startSession(user.id);
  redirect(safeNextPath(input.next));
}

const registerSchema = (t: T) =>
  z.object({
    name: z.string().trim().min(1, t("auth.errors.enterName")).max(60),
    email: email(t),
    password: newPasswordSchema(t),
  });

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const parsed = registerSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, t) };
  const input = parsed.data;

  let user;
  try {
    user = createUser({
      ...input,
      passwordHash: await hashPassword(input.password),
      // A new account starts in the language its browser asked for.
      locale: await browserLocale(),
    });
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: t(e.key, e.vars) };
    throw e;
  }

  await startSession(user.id);
  // A brand-new account goes straight into adding its first bike.
  const hasBikes = db.query.bikes
    .findFirst({ where: (b, { eq }) => eq(b.userId, user.id), columns: { id: true } })
    .sync();
  redirect(hasBikes ? "/" : "/bikes/new");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function logoutEverywhere() {
  const user = await requireUser();
  deleteUserSessions(user.id);
  await endSession();
  redirect("/login");
}
