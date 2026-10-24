"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gauge, Pencil } from "lucide-react";
import { updateOdometer } from "@/actions/bikes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { useT, useUnits } from "@/i18n/client";

/** Set when the bike takes its km from Strava. */
export type OdometerStrava = { gearName: string | null; syncedAgo: string | null };

export function OdometerForm({
  bikeId,
  odometerKm,
  strava,
}: {
  bikeId: number;
  odometerKm: number;
  strava?: OdometerStrava | null;
}) {
  const t = useT();
  const u = useUnits();
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateOdometer, {
    ok: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Close the editor once a save succeeds (adjusting state while rendering, not in an effect).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) setEditing(false);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editing) {
    return (
      <div className="bg-card flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
        <div className="flex items-center gap-3">
          <Gauge className="text-muted-foreground size-5" aria-hidden />
          <div>
            <p className="text-muted-foreground text-xs">{t("odometer.label")}</p>
            <p className="text-lg font-semibold tabular-nums">{u.distance(odometerKm)}</p>
            {strava && <StravaNote strava={strava} />}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
          {t("odometer.update")}
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
        <Label htmlFor="odometerKm">{t("odometer.labelWithUnit", { unit: u.unitLabel })}</Label>
        <Input
          ref={inputRef}
          id="odometerKm"
          name="odometerKm"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={u.toInput(odometerKm)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "odometer-error" : undefined}
          required
        />
        {state.error && (
          <p id="odometer-error" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        {strava && !state.error && (
          <p className="text-muted-foreground text-xs">{t("odometer.stravaAddsOnTop")}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function StravaNote({ strava }: { strava: OdometerStrava }) {
  const t = useT();
  if (!strava.gearName) {
    return (
      <p className="text-destructive text-xs">
        {t("odometer.stravaBikeGone")}{" "}
        <Link href="/settings" className="underline underline-offset-2">
          {t("odometer.linkAgain")}
        </Link>
      </p>
    );
  }
  return (
    <p className="text-muted-foreground text-xs">
      {strava.syncedAgo
        ? t("odometer.fromStravaSynced", { ago: strava.syncedAgo })
        : t("odometer.fromStrava")}
    </p>
  );
}
