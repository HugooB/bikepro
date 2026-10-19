"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Gauge, Pencil } from "lucide-react";
import { updateOdometer, type ActionState } from "@/actions/bikes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKm } from "@/lib/age";

export function OdometerForm({ bikeId, odometerKm }: { bikeId: number; odometerKm: number }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateOdometer, {
    ok: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editing) {
    return (
      <div className="bg-card flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
        <div className="flex items-center gap-3">
          <Gauge className="text-muted-foreground size-5" aria-hidden />
          <div>
            <p className="text-muted-foreground text-xs">Odometer</p>
            <p className="text-lg font-semibold tabular-nums">{formatKm(odometerKm)}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
          Update
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-card flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="bikeId" value={bikeId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="odometerKm">Odometer (km)</Label>
        <Input
          ref={inputRef}
          id="odometerKm"
          name="odometerKm"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={Math.round(odometerKm)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "odometer-error" : undefined}
          required
        />
        {state.error && (
          <p id="odometer-error" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
