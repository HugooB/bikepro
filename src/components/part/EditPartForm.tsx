"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { updatePart } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Part } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { daysToMonths } from "@/lib/format";

function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <Input name={props.id} {...props} />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

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
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="name" label="Name" defaultValue={part.name} required maxLength={80} />
          <Field
            id="brand"
            label="Brand"
            defaultValue={part.brand ?? ""}
            placeholder="e.g. Shimano"
            maxLength={60}
          />
          <Field
            id="model"
            label="Model"
            defaultValue={part.model ?? ""}
            placeholder="e.g. Ultegra CN-R8100"
            maxLength={80}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field
            id="installedAt"
            label="Installed on"
            type="date"
            defaultValue={part.installedAt}
            required
          />
          <Field
            id="installedKm"
            label="Odometer at install (km)"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={Math.round(part.installedKm)}
            required
          />
          <Field
            id="cost"
            label="Price €"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={part.cost ?? ""}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Service interval</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field
              id="intervalKm"
              label="Every … km"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={part.intervalKm ?? ""}
            />
            <Field
              id="intervalMonths"
              label="or every … months"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={part.intervalDays ? daysToMonths(part.intervalDays) : ""}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Whichever comes first. Leave both empty if this part has no fixed interval.
          </p>
        </fieldset>

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
