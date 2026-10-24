"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { initialActionState, type ActionState } from "@/lib/action-state";

type Props =
  { mode: "login"; next?: string } | { mode: "register"; next?: undefined; passwordMin: number };

export function AuthForm(props: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    props.mode === "login" ? login : register,
    initialActionState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const registering = props.mode === "register";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {props.next && <input type="hidden" name="next" value={props.next} />}
      {registering && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-name">{t("auth.yourName")}</Label>
          <Input
            id="auth-name"
            name="name"
            autoComplete="name"
            required
            maxLength={60}
            className="h-11 text-base"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-email">{t("auth.email")}</Label>
        <Input
          id="auth-email"
          name="email"
          type="email"
          autoComplete={registering ? "email" : "username"}
          required
          maxLength={254}
          className="h-11 text-base"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-password">{t("auth.password")}</Label>
        <div className="relative">
          <Input
            id="auth-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={registering ? "new-password" : "current-password"}
            required
            minLength={registering ? props.passwordMin : undefined}
            maxLength={128}
            aria-describedby={registering ? "auth-password-hint" : undefined}
            className="h-11 pr-11 text-base"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1.5 right-1.5"
            aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {registering && (
          <p id="auth-password-hint" className="text-muted-foreground text-xs">
            {t("auth.passwordHint", { count: props.passwordMin })}
          </p>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="bg-brand text-brand-foreground hover:bg-brand/90 h-12 text-base"
      >
        {registering
          ? pending
            ? t("auth.creatingAccount")
            : t("auth.createAccountButton")
          : pending
            ? t("auth.signingIn")
            : t("auth.signIn")}
      </Button>
    </form>
  );
}
