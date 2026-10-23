import type { ZodError } from "zod";

/** Result returned by form server actions and consumed with useActionState. */
export type ActionState = { ok: boolean; error?: string; message?: string; savedAt?: number };

export const initialActionState: ActionState = { ok: false };

/** The first validation message, for showing next to the form. */
export function firstError(error: ZodError) {
  return error.issues[0]?.message ?? "Something went wrong";
}
