"use server";

import { revalidatePath } from "next/cache";
import { AccountError, NotAdminError, resetPassword, setRegistrationOpen } from "@/db/users";
import type { ActionState } from "@/lib/action-state";
import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";

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
    if (e instanceof AccountError || e instanceof NotAdminError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }
  return { ok: true, savedAt: Date.now(), message: password };
}
