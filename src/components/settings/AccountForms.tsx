"use client";

import { useActionState, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, deleteMyAccount } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { initialActionState, type ActionState } from "@/lib/action-state";

function PasswordField({
  id,
  label,
  name,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={128}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Settings → Account: a "Change password" button that opens the form in place. */
export function ChangePasswordForm({ passwordMin }: { passwordMin: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await changePassword(prev, formData);
      if (result.ok) {
        toast.success(t("settings.password.changed"));
        setOpen(false);
      }
      return result;
    },
    initialActionState,
  );

  if (!open) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        {t("settings.password.change")}
      </Button>
    );
  }

  return (
    <form action={formAction} className="bg-card flex flex-col gap-4 rounded-xl border px-4 py-4">
      <h3 className="font-semibold">{t("settings.password.change")}</h3>
      <PasswordField
        id="current-password"
        label={t("settings.password.current")}
        name="current"
        autoComplete="current-password"
      />
      <PasswordField
        id="new-password"
        label={t("settings.password.new")}
        name="password"
        autoComplete="new-password"
        minLength={passwordMin}
        hint={t("settings.password.newHint", { count: passwordMin })}
      />
      <PasswordField
        id="confirm-password"
        label={t("settings.password.again")}
        name="confirm"
        autoComplete="new-password"
        minLength={passwordMin}
      />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("settings.password.change")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Settings → Danger zone. Asks for the password, then deletes the account and signs out. */
export function DeleteAccountForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteMyAccount,
    initialActionState,
  );

  return (
    <div className="border-destructive/40 flex flex-col gap-4 rounded-xl border px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{t("settings.danger.deleteTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("settings.danger.deleteIntro")}</p>
      </div>
      <Button asChild variant="outline" className="self-start">
        <a href="/api/export" download>
          <Download aria-hidden />
          {t("settings.data.download")}
        </a>
      </Button>
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (!confirm(t("settings.danger.confirm"))) {
            e.preventDefault();
          }
        }}
      >
        <PasswordField
          id="delete-password"
          label={t("settings.danger.password")}
          name="password"
          autoComplete="current-password"
        />
        {state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="destructive" disabled={pending} className="self-start">
          <Trash2 aria-hidden />
          {pending ? t("settings.danger.deleting") : t("settings.danger.delete")}
        </Button>
      </form>
    </div>
  );
}
