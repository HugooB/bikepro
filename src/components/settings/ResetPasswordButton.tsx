"use client";

import { useActionState } from "react";
import { resetUserPassword } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { initialActionState, type ActionState } from "@/lib/action-state";

/**
 * Settings → Admin: resets one user's password. The temporary password is shown here once;
 * it isn't stored anywhere the admin can look it up again.
 */
export function ResetPasswordButton({ userId, name }: { userId: number; name: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetUserPassword,
    initialActionState,
  );

  if (state.ok && state.message) {
    return (
      <div className="flex w-full flex-col gap-1 text-sm">
        <p>
          {rich(t("settings.admin.tempPassword", { name, password: state.message }), {
            code: (text) => (
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono select-all">{text}</code>
            ),
          })}
        </p>
        <p className="text-muted-foreground text-xs">{t("settings.admin.tempPasswordHint")}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t("settings.admin.confirmReset", { name }))) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("settings.admin.resetting") : t("settings.admin.reset")}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
