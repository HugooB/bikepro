"use client";

import { useActionState, useEffect } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { importMyData } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { initialActionState, type ActionState } from "@/lib/action-state";

/** Settings → Your data: adds the bikes from a BikePro export to this account. */
export function ImportDataForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importMyData,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="import-file">{t("settings.data.importLabel")}</Label>
        <Input
          id="import-file"
          name="file"
          type="file"
          accept="application/json,.json"
          required
          aria-describedby="import-file-hint"
        />
        <p id="import-file-hint" className="text-muted-foreground text-xs">
          {t("settings.data.importHint")}
        </p>
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        <Upload aria-hidden />
        {pending ? t("settings.data.importing") : t("settings.data.import")}
      </Button>
    </form>
  );
}
