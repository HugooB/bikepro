"use client";

import { Trash2 } from "lucide-react";
import { deleteServiceRound } from "@/actions/service-rounds";
import { Button } from "@/components/ui/button";

type Props = { roundId: number; hasReplacements: boolean };

export function DeleteServiceRoundButton({ roundId, hasReplacements }: Props) {
  return (
    <form
      action={deleteServiceRound}
      onSubmit={(e) => {
        const message = hasReplacements
          ? "Delete this service round and its entries? Parts replaced in it stay replaced."
          : "Delete this service round and its entries on each part?";
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="serviceRoundId" value={roundId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="Delete service round"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 aria-hidden />
      </Button>
    </form>
  );
}
