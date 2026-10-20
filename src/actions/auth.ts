"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { deleteUserSessions } from "@/db/sessions";
import { createUser, findUserByEmail, normalizeEmail, RegistrationError } from "@/db/users";
import type { ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/auth/next-path";
import {
  burnPasswordCheck,
  hashPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
  verifyPassword,
} from "@/lib/auth/password";
import { endSession, requireUser, startSession } from "@/lib/auth/session";
import { clearFailures, isThrottled, recordFailure } from "@/lib/auth/throttle";

const email = z.email("Enter a valid email address").max(254);

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
  next: z.string().optional(),
});

const SIGN_IN_FAILED = "Email or password is incorrect";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  const key = normalizeEmail(input.email);
  if (isThrottled(key)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const user = findUserByEmail(input.email);
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await burnPasswordCheck(input.password), false);
  if (!user || !valid) {
    recordFailure(key);
    return { ok: false, error: SIGN_IN_FAILED };
  }

  clearFailures(key);
  await startSession(user.id);
  redirect(safeNextPath(input.next));
}

const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`),
});

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  let user;
  try {
    user = createUser({ ...input, passwordHash: await hashPassword(input.password) });
  } catch (e) {
    if (e instanceof RegistrationError) return { ok: false, error: e.message };
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
