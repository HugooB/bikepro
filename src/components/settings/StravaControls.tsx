"use client";

import { useActionState, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { linkStravaBike, syncStravaNow, unlinkStravaBike } from "@/actions/strava";
import { ChoiceChip } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { StravaGear } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { useT, useUnits } from "@/i18n/client";

export function SyncNowButton() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    syncStravaNow,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok) toast.success(t("strava.controls.synced"));
    else if (state.error) toast.error(state.error);
    // Only react to a new sync result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" disabled={pending}>
        <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} />
        {pending ? t("strava.controls.syncing") : t("strava.controls.syncNow")}
      </Button>
    </form>
  );
}

type LinkBike = {
  id: number;
  name: string;
  color: string | null;
  odometerKm: number;
  stravaGearId: string | null;
};

/** One BikePro bike in Settings: which Strava bike it takes its kilometres from. */
export function StravaBikeLink({
  bike,
  gear,
  linkedTo,
}: {
  bike: LinkBike;
  gear: StravaGear[];
  /** Strava bike id → name of the BikePro bike it's linked to. */
  linkedTo: Record<string, string>;
}) {
  const t = useT();
  const linked = bike.stravaGearId ? gear.find((g) => g.id === bike.stravaGearId) : undefined;

  return (
    <li className="bg-card rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full"
          style={{ background: bike.color || "var(--brand)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{bike.name}</p>
          {bike.stravaGearId && (
            <p className="text-muted-foreground truncate text-sm">
              {linked ? (
                t("strava.controls.linkedTo", { bike: linked.name })
              ) : (
                <span className="text-destructive">{t("strava.controls.gone")}</span>
              )}
            </p>
          )}
        </div>
        {bike.stravaGearId && (
          <form action={unlinkStravaBike}>
            <input type="hidden" name="bikeId" value={bike.id} />
            <Button type="submit" variant="ghost" size="sm">
              {t("strava.controls.unlink")}
            </Button>
          </form>
        )}
      </div>
      {!bike.stravaGearId && <LinkForm bike={bike} gear={gear} linkedTo={linkedTo} />}
    </li>
  );
}

function LinkForm({
  bike,
  gear,
  linkedTo,
}: {
  bike: LinkBike;
  gear: StravaGear[];
  linkedTo: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    linkStravaBike,
    initialActionState,
  );
  const t = useT();
  const u = useUnits();
  const [gearId, setGearId] = useState("");
  // Keeping the reading is the safe default: jumping to Strava's total changes every part's wear.
  const [keep, setKeep] = useState<"strava" | "mine">("mine");
  const chosen = gear.find((g) => g.id === gearId);
  // Only ask which reading to keep when they actually differ.
  const differs = chosen && Math.abs(chosen.distanceKm - bike.odometerKm) >= 1;
  const selectId = `strava-gear-${bike.id}`;

  useEffect(() => {
    if (state.ok) toast.success(t("strava.controls.linked", { bike: bike.name }));
    // Only react to a new save result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (gear.length === 0) {
    return <p className="text-muted-foreground mt-2 text-sm">{t("strava.controls.noGear")}</p>;
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 border-t pt-3">
      <input type="hidden" name="bikeId" value={bike.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId}>{t("strava.controls.stravaBike")}</Label>
        <select
          id={selectId}
          name="gearId"
          value={gearId}
          onChange={(e) => setGearId(e.target.value)}
          className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="">{t("strava.controls.notLinked")}</option>
          {gear.map((g) => (
            <option key={g.id} value={g.id} disabled={g.id in linkedTo}>
              {g.name} · {u.distance(g.distanceKm)}
              {g.id in linkedTo
                ? ` ${t("strava.controls.linkedToOther", { bike: linkedTo[g.id]! })}`
                : g.retired
                  ? ` ${t("strava.controls.retired")}`
                  : ""}
            </option>
          ))}
        </select>
      </div>

      {chosen && differs && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("strava.controls.whichReading")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceChip
              name={`keep-${bike.id}`}
              checked={keep === "mine"}
              onChange={() => setKeep("mine")}
            >
              {t("strava.controls.keepMine", { distance: u.distance(bike.odometerKm) })}
            </ChoiceChip>
            <ChoiceChip
              name={`keep-${bike.id}`}
              checked={keep === "strava"}
              onChange={() => setKeep("strava")}
            >
              {t("strava.controls.useStrava", { distance: u.distance(chosen.distanceKm) })}
            </ChoiceChip>
          </div>
          <p className="text-muted-foreground text-xs">
            {keep === "mine"
              ? t("strava.controls.keepMineHint")
              : chosen.distanceKm > bike.odometerKm
                ? t("strava.controls.extraHint", {
                    distance: u.distance(chosen.distanceKm - bike.odometerKm),
                  })
                : t("strava.controls.backHint", {
                    distance: u.distance(bike.odometerKm - chosen.distanceKm),
                  })}
          </p>
          <input type="hidden" name="keep" value={keep} />
        </fieldset>
      )}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {chosen && (
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? t("strava.controls.linking") : t("strava.controls.link")}
        </Button>
      )}
    </form>
  );
}
