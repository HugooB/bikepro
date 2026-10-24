import type { ZodError } from "zod";
import { tEn, type T } from "@/i18n";

/** Result returned by form server actions and consumed with useActionState. */
export type ActionState = { ok: boolean; error?: string; message?: string; savedAt?: number };

export const initialActionState: ActionState = { ok: false };

/** The first validation message, for showing next to the form. */
export function firstError(error: ZodError, t: T = tEn) {
  return error.issues[0]?.message ?? t("common.somethingWentWrong");
}
