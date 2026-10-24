"use server";

import { revalidatePath } from "next/cache";
import { resetPassword, setRegistrationOpen } from "@/db/users";
import { getT } from "@/i18n/server";
import type { ActionState } from "@/lib/action-state";
import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { UserError } from "@/lib/user-error";

/** Opens or closes registration (Settings → Admin). Refused for anyone who isn't an admin. */
export async function updateRegistration(formData: FormData) {
  const user = await requireUser();
  setRegistrationOpen(user.id, formData.get("open") === "true");
  revalidatePath("/settings");
}

/**
 * Settings → Admin: gives another account a temporary password and signs it out everywhere.
 * The password is returned once, as `message`, for the admin to pass on.
 */
export async function resetUserPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const password = temporaryPassword();
  try {
    resetPassword(user.id, Number(formData.get("userId")), await hashPassword(password));
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: (await getT())(e.key, e.vars) };
    throw e;
  }
  return { ok: true, savedAt: Date.now(), message: password };
}
