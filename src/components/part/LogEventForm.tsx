"use client";

import { useActionState, useEffect, useState } from "react";
import { addPartEvent } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/lib/action-state";
import {
  descriptionPlaceholders,
  eventTypeLabels,
  loggableEventTypes,
  resetsByDefault,
  type LoggableEventType,
} from "@/lib/event-types";
import { cn } from "@/lib/utils";

type Props = { partId: number; partName: string; odometerKm: number; today: string };

export function LogEventForm({ partId, partName, odometerKm, today }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addPartEvent,
    initialActionState,
  );
  const [type, setType] = useState<LoggableEventType>("serviced");
  const [resets, setResets] = useState(resetsByDefault.serviced);
  const [formKey, setFormKey] = useState(0);

  // After a successful save, clear the form for the next entry.
  useEffect(() => {
    if (state.ok) {
      setFormKey((k) => k + 1);
      setType("serviced");
      setResets(resetsByDefault.serviced);
    }
  }, [state]);

  function chooseType(next: LoggableEventType) {
    setType(next);
    setResets(resetsByDefault[next]);
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="bg-card flex flex-col gap-4 rounded-xl border p-4"
    >
      <input type="hidden" name="partId" value={partId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">What did you do?</legend>
        <div className="flex flex-wrap gap-2">
          {loggableEventTypes.map((t) => (
            <label
              key={t}
              className={cn(
                "has-focus-visible:ring-ring cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors select-none has-focus-visible:ring-2",
                type === t
                  ? "border-foreground bg-foreground text-background"
                  : "bg-background hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => chooseType(t)}
                className="sr-only"
              />
              {eventTypeLabels[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Details (optional)</Label>
        <Input
          id="description"
          name="description"
          maxLength={200}
          placeholder={descriptionPlaceholders[type]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} max={today} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="odometerKm">Odometer (km)</Label>
          <Input
            id="odometerKm"
            name="odometerKm"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={Math.round(odometerKm)}
            required
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="cost">Cost € (optional)</Label>
          <Input id="cost" name="cost" type="number" inputMode="decimal" min={0} step="0.01" />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="resetsInterval"
          checked={type === "replaced" || resets}
          disabled={type === "replaced"}
          onChange={(e) => setResets(e.target.checked)}
          className="accent-brand mt-0.5 size-4"
        />
        <span>
          <span className="font-medium">Restart the service interval</span>
          <span className="text-muted-foreground block">
            {type === "replaced"
              ? `A new ${partName.toLowerCase()} starts fresh: its age and km reset.`
              : "Count the next service from this date and odometer reading."}
          </span>
        </span>
      </label>
      {/* Disabled inputs aren't submitted, so send the value for replacements explicitly. */}
      {type === "replaced" && <input type="hidden" name="resetsInterval" value="on" />}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Saving…" : "Add to history"}
      </Button>
    </form>
  );
}
