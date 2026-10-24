"use client";

import { Trash2 } from "lucide-react";
import { deletePartEvent } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function DeleteEventButton({ eventId }: { eventId: number }) {
  const t = useT();
  return (
    <form
      action={deletePartEvent}
      onSubmit={(e) => {
        if (!confirm(t("part.timeline.confirmDelete"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={t("part.timeline.deleteEntry")}
        className="text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100"
      >
        <Trash2 aria-hidden />
      </Button>
    </form>
  );
}
