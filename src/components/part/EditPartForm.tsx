"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { updatePart } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import type { Part } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { PartFields } from "./PartFields";

export function EditPartForm({ part }: { part: Part }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePart,
    initialActionState,
  );
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state.ok && detailsRef.current) detailsRef.current.open = false;
  }, [state]);

  return (
    <details ref={detailsRef} className="group bg-card rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        Edit part details & service interval
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <form action={formAction} className="flex flex-col gap-4 border-t p-4">
        <input type="hidden" name="partId" value={part.id} />
        <PartFields values={part} />
        {state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full sm:w-fit">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}
