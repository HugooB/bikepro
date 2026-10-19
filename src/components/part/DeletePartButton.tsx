"use client";

import { Trash2 } from "lucide-react";
import { deletePart } from "@/actions/parts";
import { Button } from "@/components/ui/button";

export function DeletePartButton({ partId, partName }: { partId: number; partName: string }) {
  return (
    <form
      action={deletePart}
      onSubmit={(e) => {
        if (
          !confirm(
            `Remove the ${partName.toLowerCase()} and its whole history? This can't be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="partId" value={partId} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive hover:text-destructive w-full sm:w-auto"
      >
        <Trash2 aria-hidden />
        Remove part
      </Button>
    </form>
  );
}
