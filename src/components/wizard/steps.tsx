"use client";

import { useState } from "react";
import { format, formatISO, parseISO, startOfMonth, startOfYear } from "date-fns";
import { ChevronDown } from "lucide-react";
import { BikeDrawing } from "@/components/bike/BikeDrawing";
import { ZoneProvider } from "@/components/bike/zone-context";
import { BikeTypePicker, FrameColorPicker } from "@/components/BikeFields";
import { Button } from "@/components/ui/button";
import { formatAge, formatKm } from "@/lib/age";
import { formatCost } from "@/lib/format";
import { bikeTypeLabels, frameColors } from "@/lib/bikes";
import { categoryLabels, defaultPartsFor } from "@/lib/default-parts";
import { cn } from "@/lib/utils";
import { partsByCategory, startKm, type WizardDraft, type WizardStep } from "@/lib/wizard-schema";
import { ChoiceChip, StepHeading, WizardField } from "./fields";
import type { WizardAction } from "./wizard-state";

/** What the wizard knows about the user's Strava account. */
export type WizardStrava = {
  configured: boolean;
  connected: boolean;
  /** Strava bikes not linked to a BikePro bike yet. */
  bikes: { id: string; name: string; distanceKm: number }[];
  /** ?strava= outcome after coming back from connecting. */
  outcome?: string;
};

export type StepProps = {
  draft: WizardDraft;
  errors: Record<string, string>;
  dispatch: React.Dispatch<WizardAction>;
  today: string;
  headingRef: React.Ref<HTMLHeadingElement>;
  strava: WizardStrava;
};

export function StepBasics({ draft, errors, dispatch, headingRef }: StepProps) {
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title="Let's add your bike"
        intro="Give it a name you'll recognise. The type picks a sensible list of parts."
      />
      <WizardField
        id="bike-name"
        label="Name"
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="e.g. My Canyon"
        maxLength={40}
        autoComplete="off"
        error={errors.name}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <BikeTypePicker
          value={draft.type}
          onChange={(bikeType) => dispatch({ type: "bikeType", bikeType })}
        />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <WizardField
          id="bike-brand"
          label="Brand (optional)"
          value={draft.brand}
          onChange={(e) => patch({ brand: e.target.value })}
          placeholder="e.g. Canyon"
          maxLength={60}
        />
        <WizardField
          id="bike-model"
          label="Model (optional)"
          value={draft.model}
          onChange={(e) => patch({ model: e.target.value })}
          placeholder="e.g. Ultimate CF SL"
          maxLength={80}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Frame colour</legend>
        <FrameColorPicker value={draft.color} onChange={(color) => patch({ color })} />
        <p className="text-muted-foreground text-xs">Used for your bike&apos;s drawing.</p>
      </fieldset>
    </>
  );
}

/** Kilometres step: pick a Strava bike to take them from, or type the odometer reading. */
export function StepStrava({ draft, errors, dispatch, headingRef, strava }: StepProps) {
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  const offerStrava = strava.connected && strava.bikes.length > 0;
  const fromStrava = strava.bikes.some((b) => b.id === draft.stravaGearId);
  const connectFailed = strava.outcome && strava.outcome !== "connected";

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title="How far has it been ridden?"
        intro={
          offerStrava
            ? "Take the kilometres from Strava and they stay up to date, or enter the odometer yourself."
            : "Enter the odometer reading. Part wear is counted from this, and you can update it any time."
        }
      />
      {offerStrava && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Kilometres from</legend>
          <div className="grid gap-2">
            {strava.bikes.map((b) => (
              <ChoiceChip
                key={b.id}
                name="km-source"
                checked={draft.stravaGearId === b.id}
                onChange={() =>
                  patch({ stravaGearId: b.id, odometerKm: String(Math.round(b.distanceKm)) })
                }
              >
                {b.name} on Strava · {formatKm(b.distanceKm)}
              </ChoiceChip>
            ))}
            <ChoiceChip
              name="km-source"
              checked={!fromStrava}
              onChange={() => patch({ stravaGearId: "" })}
            >
              Enter it by hand
            </ChoiceChip>
          </div>
        </fieldset>
      )}
      {!fromStrava && (
        <WizardField
          id="bike-odometer"
          label="Odometer (km)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={draft.odometerKm}
          onChange={(e) => patch({ odometerKm: e.target.value })}
          onFocus={(e) => e.target.select()}
          error={errors.odometerKm}
          hint="A brand-new bike starts at 0."
        />
      )}
      {connectFailed && (
        <p role="alert" className="text-destructive text-sm">
          Strava didn&apos;t connect. You can enter the kilometres by hand, or try again from
          Settings.
        </p>
      )}
      {strava.configured && !strava.connected && !connectFailed && (
        <p className="text-muted-foreground text-sm">
          Ride with Strava?{" "}
          <a
            href={`/api/strava/connect?next=${encodeURIComponent("/bikes/new")}`}
            className="text-foreground font-medium underline"
          >
            Connect Strava
          </a>{" "}
          to fill this in and keep it up to date. Your answers so far are kept.
        </p>
      )}
    </>
  );
}

export function StepPurchase({ draft, errors, dispatch, today, headingRef }: StepProps) {
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  const todayDate = parseISO(today);
  const quickPicks = [
    {
      key: "month",
      label: "This month",
      value: formatISO(startOfMonth(todayDate), { representation: "date" }),
    },
    {
      key: "year",
      label: "This year",
      value: formatISO(startOfYear(todayDate), { representation: "date" }),
    },
  ];
  const picked = quickPicks.find((q) => q.value === draft.purchasedAt)?.key;
  const [custom, setCustom] = useState(!picked && draft.purchasedAt !== today);
  const mode = custom ? "date" : (picked ?? "date");

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title="When did you get it?"
        intro="Every part starts its life on this date, unless you tell us it was replaced since."
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Purchase date</legend>
        <div className="grid grid-cols-3 gap-2">
          {quickPicks.map((q) => (
            <ChoiceChip
              key={q.key}
              name="purchase-pick"
              checked={mode === q.key}
              onChange={() => {
                setCustom(false);
                patch({ purchasedAt: q.value });
              }}
            >
              {q.label}
            </ChoiceChip>
          ))}
          <ChoiceChip
            name="purchase-pick"
            checked={mode === "date"}
            onChange={() => setCustom(true)}
          >
            Pick a date
          </ChoiceChip>
        </div>
        {mode === "date" ? (
          <WizardField
            id="bike-purchased"
            label="Purchase date"
            type="date"
            max={today}
            value={draft.purchasedAt}
            onChange={(e) => patch({ purchasedAt: e.target.value })}
            error={errors.purchasedAt}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Counted from {format(parseISO(draft.purchasedAt), "d MMMM yyyy")}.
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Was it new?</legend>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceChip
            name="condition"
            checked={draft.condition === "new"}
            onChange={() => patch({ condition: "new" })}
          >
            New
          </ChoiceChip>
          <ChoiceChip
            name="condition"
            checked={draft.condition === "used"}
            onChange={() => patch({ condition: "used" })}
          >
            Second-hand
          </ChoiceChip>
        </div>
        {draft.condition === "used" && (
          <WizardField
            id="bike-purchase-km"
            label="Odometer when you bought it (km)"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft.purchaseKm}
            onChange={(e) => patch({ purchaseKm: e.target.value })}
            onFocus={(e) => e.target.select()}
            error={errors.purchaseKm}
            hint="Parts count their km from here. Leave 0 if you don't know."
          />
        )}
      </fieldset>

      <WizardField
        id="bike-price"
        label="Price you paid € (optional)"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={draft.purchasePrice}
        onChange={(e) => patch({ purchasePrice: e.target.value })}
        error={errors.purchasePrice}
        hint="Counts towards the bike's total cost."
      />
    </>
  );
}

export function StepParts({ draft, errors, dispatch, today, headingRef }: StepProps) {
  const [showIntervals, setShowIntervals] = useState(
    Object.keys(errors).some((k) => k.endsWith("intervalKm") || k.endsWith("intervalMonths")),
  );
  const indexOf = new Map(draft.parts.map((p, i) => [p.kind, i]));
  const included = draft.parts.filter((p) => p.included).length;
  const fromKm = startKm(draft);

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title="Which parts does it have?"
        intro="Untick anything your bike doesn't have. If you've replaced a part since buying the bike, tell us when, so its age is right from day one."
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {included} of {draft.parts.length} parts
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showIntervals}
          onClick={() => setShowIntervals((v) => !v)}
        >
          Advanced: service intervals
          <ChevronDown
            aria-hidden
            className={cn("transition-transform", showIntervals && "rotate-180")}
          />
        </Button>
      </div>
      {errors.parts && (
        <p role="alert" className="text-destructive text-sm">
          {errors.parts}
        </p>
      )}

      {partsByCategory(draft.type).map(([category, templates]) => (
        <fieldset key={category} className="flex flex-col gap-1.5">
          <legend className="text-muted-foreground mb-1.5 px-1 text-sm font-medium">
            {categoryLabels[category]}
          </legend>
          <ul className="divide-y overflow-hidden rounded-xl border">
            {templates.map((t) => {
              const i = indexOf.get(t.kind)!;
              const choice = draft.parts[i];
              const err = (field: string) => errors[`parts.${i}.${field}`];
              const set = (patch: Partial<typeof choice>) =>
                dispatch({ type: "part", kind: t.kind, patch });
              const id = `part-${t.kind}`;
              return (
                <li key={t.kind} className={cn(!choice.included && "bg-muted/40")}>
                  <div className="flex items-center gap-3 px-3">
                    <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={choice.included}
                        onChange={(e) => set({ included: e.target.checked })}
                        className="accent-brand size-5 shrink-0"
                      />
                      <span
                        className={cn(
                          "truncate font-medium",
                          !choice.included && "text-muted-foreground line-through",
                        )}
                      >
                        {t.name}
                      </span>
                    </label>
                    {choice.included && (
                      <label className="text-muted-foreground flex shrink-0 cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={choice.replaced}
                          onChange={(e) =>
                            set({
                              replaced: e.target.checked,
                              replacedAt: choice.replacedAt || today,
                            })
                          }
                          className="accent-brand size-4"
                        />
                        Replaced since purchase?
                      </label>
                    )}
                  </div>

                  {choice.included && (choice.replaced || showIntervals) && (
                    <div className="flex flex-col gap-3 px-3 pb-3 sm:pl-11">
                      {choice.replaced && (
                        <div className="grid grid-cols-2 gap-3">
                          <WizardField
                            id={`${id}-replaced-at`}
                            label="Replaced on"
                            type="date"
                            min={draft.purchasedAt}
                            max={today}
                            value={choice.replacedAt}
                            onChange={(e) => set({ replacedAt: e.target.value })}
                            error={err("replacedAt")}
                          />
                          <WizardField
                            id={`${id}-replaced-km`}
                            label="At km (optional)"
                            type="number"
                            inputMode="decimal"
                            min={fromKm}
                            step="any"
                            value={choice.replacedKm}
                            onChange={(e) => set({ replacedKm: e.target.value })}
                            placeholder="Estimate"
                            error={err("replacedKm")}
                            hint="Leave empty to estimate it from your riding."
                          />
                        </div>
                      )}
                      {showIntervals && (
                        <div className="grid grid-cols-2 gap-3">
                          <WizardField
                            id={`${id}-interval-km`}
                            label="Service every … km"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.intervalKm}
                            onChange={(e) => set({ intervalKm: e.target.value })}
                            placeholder="No limit"
                            error={err("intervalKm")}
                          />
                          <WizardField
                            id={`${id}-interval-months`}
                            label="or every … months"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.intervalMonths}
                            onChange={(e) => set({ intervalMonths: e.target.value })}
                            placeholder="No limit"
                            error={err("intervalMonths")}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </>
  );
}

export function StepReview({
  draft,
  headingRef,
  strava,
  onEdit,
}: StepProps & { onEdit: (step: WizardStep) => void }) {
  const stravaBike = strava.bikes.find((b) => b.id === draft.stravaGearId);
  const templates = new Map(defaultPartsFor(draft.type).map((t) => [t.kind, t]));
  const chosen = draft.parts.filter((p) => p.included);
  const replaced = chosen.filter((p) => p.replaced).length;
  const makeModel = [draft.brand, draft.model].filter((s) => s.trim()).join(" ");
  const colorName =
    frameColors.find((c) => c.value === draft.color.toLowerCase())?.name ?? "Custom";

  const drawingParts = chosen.map((p, i) => {
    const t = templates.get(p.kind)!;
    return {
      id: i,
      name: t.name,
      zone: t.svgZone,
      level: "ok" as const,
      hint:
        p.replaced && p.replacedAt ? `Fitted ${formatAge(p.replacedAt)} ago` : "Came with the bike",
    };
  });

  const rows: { label: string; value: string; step: WizardStep }[] = [
    { label: "Type", value: bikeTypeLabels[draft.type].name, step: "basics" },
    ...(makeModel ? [{ label: "Make", value: makeModel, step: "basics" as const }] : []),
    { label: "Frame colour", value: colorName, step: "basics" },
    {
      label: "Odometer",
      value: stravaBike
        ? `${formatKm(stravaBike.distanceKm)}, from ${stravaBike.name} on Strava`
        : `${formatKm(Number(draft.odometerKm) || 0)}, entered by hand`,
      step: "odometer",
    },
    {
      label: "Got it on",
      value: `${format(parseISO(draft.purchasedAt), "d MMM yyyy")}, ${draft.condition === "new" ? "new" : `second-hand at ${formatKm(startKm(draft))}`}`,
      step: "purchase",
    },
    ...(draft.purchasePrice !== ""
      ? [
          {
            label: "Price",
            value: formatCost(Number(draft.purchasePrice) || 0),
            step: "purchase" as const,
          },
        ]
      : []),
    {
      label: "Parts",
      value: `${chosen.length} part${chosen.length === 1 ? "" : "s"}${replaced ? `, ${replaced} replaced since` : ""}`,
      step: "parts",
    },
  ];

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title="Ready to roll?"
        intro="Check the details, then add your bike."
      />
      <div className="overflow-hidden rounded-2xl border">
        <div className="bg-muted/40 px-3 pt-4 pb-2">
          <ZoneProvider>
            <BikeDrawing parts={drawingParts} color={draft.color} />
          </ZoneProvider>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="font-display text-2xl leading-none">{draft.name.trim()}</p>
          <dl className="divide-y text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-2">
                <dt className="text-muted-foreground w-28 shrink-0">{row.label}</dt>
                <dd className="min-w-0 flex-1">{row.value}</dd>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(row.step)}
                  aria-label={`Edit ${row.label.toLowerCase()}`}
                >
                  Edit
                </Button>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  );
}
