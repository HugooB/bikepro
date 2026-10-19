"use client";

import { Trash2 } from "lucide-react";
import { deletePartEvent } from "@/actions/parts";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({ eventId }: { eventId: number }) {
  return (
    <form
      action={deletePartEvent}
      onSubmit={(e) => {
        if (!confirm("Delete this entry from the history?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="Delete entry"
        className="text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100"
      >
        <Trash2 aria-hidden />
      </Button>
    </form>
  );
}
