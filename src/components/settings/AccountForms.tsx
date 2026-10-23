"use client";

import { useActionState, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, deleteMyAccount } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await changePassword(prev, formData);
      if (result.ok) {
        toast.success("Password changed. Your other devices are signed out.");
        setOpen(false);
      }
      return result;
    },
    initialActionState,
  );

  if (!open) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        Change password
      </Button>
    );
  }

  return (
    <form action={formAction} className="bg-card flex flex-col gap-4 rounded-xl border px-4 py-4">
      <h3 className="font-semibold">Change password</h3>
      <PasswordField
        id="current-password"
        label="Current password"
        name="current"
        autoComplete="current-password"
      />
      <PasswordField
        id="new-password"
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={passwordMin}
        hint={`At least ${passwordMin} characters. Your other devices are signed out afterwards.`}
      />
      <PasswordField
        id="confirm-password"
        label="New password again"
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
          {pending ? "Saving…" : "Change password"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Settings → Danger zone. Asks for the password, then deletes the account and signs out. */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteMyAccount,
    initialActionState,
  );

  return (
    <div className="border-destructive/40 flex flex-col gap-4 rounded-xl border px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Delete account</h3>
        <p className="text-muted-foreground text-sm">
          Deletes your account with all your bikes, parts, history and costs, and disconnects
          Strava. This can&apos;t be undone, so download your data first if you might want it back.
        </p>
      </div>
      <Button asChild variant="outline" className="self-start">
        <a href="/api/export" download>
          <Download aria-hidden />
          Download my data
        </a>
      </Button>
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (!confirm("Delete your account and all your data? This can't be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <PasswordField
          id="delete-password"
          label="Your password"
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
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
    </div>
  );
}
