"use client";

import { Trash2 } from "lucide-react";
import { deleteServiceRound } from "@/actions/service-rounds";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

type Props = { roundId: number; hasReplacements: boolean };

export function DeleteServiceRoundButton({ roundId, hasReplacements }: Props) {
  const t = useT();
  return (
    <form
      action={deleteServiceRound}
      onSubmit={(e) => {
        const message = hasReplacements
          ? t("history.confirmDeleteWithReplacements")
          : t("history.confirmDelete");
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="serviceRoundId" value={roundId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={t("history.deleteRound")}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 aria-hidden />
      </Button>
    </form>
  );
}
