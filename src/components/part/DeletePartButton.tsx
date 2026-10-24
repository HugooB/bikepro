"use client";

import { Trash2 } from "lucide-react";
import { deletePart } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function DeletePartButton({ partId, partName }: { partId: number; partName: string }) {
  const t = useT();
  return (
    <form
      action={deletePart}
      onSubmit={(e) => {
        if (!confirm(t("part.confirmRemove", { part: partName.toLowerCase() }))) {
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
        {t("part.removeButton")}
      </Button>
    </form>
  );
}
