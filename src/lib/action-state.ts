/** Result returned by form server actions and consumed with useActionState. */
export type ActionState = { ok: boolean; error?: string; savedAt?: number };

export const initialActionState: ActionState = { ok: false };
