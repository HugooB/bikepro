"use client";

import { useState } from "react";
import { formatISO, parseISO, startOfMonth, startOfYear } from "date-fns";
import { ChevronDown } from "lucide-react";
import { BikeDrawing } from "@/components/bike/BikeDrawing";
import { ZoneProvider } from "@/components/bike/zone-context";
import { BikeTypePicker, FrameColorPicker } from "@/components/BikeFields";
import { brakeTypes, tireTypes } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { useT, useUnits } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { formatAge } from "@/lib/age";
import { frameColors } from "@/lib/bikes";
import { defaultPartsFor, partName } from "@/lib/default-parts";
import { formatDistance, fromUnit } from "@/lib/units";
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
  const t = useT();
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title={t("wizard.basics.title")}
        intro={t("wizard.basics.intro")}
      />
      <WizardField
        id="bike-name"
        label={t("bikeForm.name")}
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder={t("wizard.basics.namePlaceholder")}
        maxLength={40}
        autoComplete="off"
        error={errors.name}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.type")}</legend>
        <BikeTypePicker
          value={draft.type}
          onChange={(bikeType) => dispatch({ type: "bikeType", bikeType })}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.brakes")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {brakeTypes.map((brakeType) => (
            <ChoiceChip
              key={brakeType}
              name="brake-type"
              checked={draft.brakeType === brakeType}
              onChange={() => dispatch({ type: "brakeType", brakeType })}
            >
              {t(`brakeTypes.${brakeType}`)}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {draft.brakeType === "disc"
            ? t("wizard.basics.discTracked")
            : t("wizard.basics.rimTracked")}
        </p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.tires")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {tireTypes.map((tireType) => (
            <ChoiceChip
              key={tireType}
              name="tire-type"
              checked={draft.tireType === tireType}
              onChange={() => dispatch({ type: "tireType", tireType })}
            >
              {t(`tireTypes.${tireType}`)}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {draft.tireType === "tubeless"
            ? t("wizard.basics.tubelessTracked")
            : t("wizard.basics.tubesTracked")}
        </p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <WizardField
          id="bike-brand"
          label={t("wizard.basics.brand")}
          value={draft.brand}
          onChange={(e) => patch({ brand: e.target.value })}
          placeholder={t("wizard.basics.brandPlaceholder")}
          maxLength={60}
        />
        <WizardField
          id="bike-model"
          label={t("wizard.basics.model")}
          value={draft.model}
          onChange={(e) => patch({ model: e.target.value })}
          placeholder={t("wizard.basics.modelPlaceholder")}
          maxLength={80}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.frameColor")}</legend>
        <FrameColorPicker value={draft.color} onChange={(color) => patch({ color })} />
        <p className="text-muted-foreground text-xs">{t("wizard.basics.colorHint")}</p>
      </fieldset>
    </>
  );
}

/** Distance step: pick a Strava bike to take it from, or type the odometer reading. */
export function StepStrava({ draft, errors, dispatch, headingRef, strava }: StepProps) {
  const t = useT();
  const u = useUnits();
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  const offerStrava = strava.connected && strava.bikes.length > 0;
  const fromStrava = strava.bikes.some((b) => b.id === draft.stravaGearId);
  const connectFailed = strava.outcome && strava.outcome !== "connected";

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title={t("wizard.distance.title")}
        intro={
          offerStrava
            ? t("wizard.distance.introStrava", { distances: u.unitLong })
            : t("wizard.distance.intro")
        }
      />
      {offerStrava && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("wizard.distance.from")}</legend>
          <div className="grid gap-2">
            {strava.bikes.map((b) => (
              <ChoiceChip
                key={b.id}
                name="km-source"
                checked={draft.stravaGearId === b.id}
                onChange={() =>
                  patch({ stravaGearId: b.id, odometerKm: String(u.toInput(b.distanceKm)) })
                }
              >
                {t("wizard.distance.stravaBike", {
                  bike: b.name,
                  distance: u.distance(b.distanceKm),
                })}
              </ChoiceChip>
            ))}
            <ChoiceChip
              name="km-source"
              checked={!fromStrava}
              onChange={() => patch({ stravaGearId: "" })}
            >
              {t("wizard.distance.byHand")}
            </ChoiceChip>
          </div>
        </fieldset>
      )}
      {!fromStrava && (
        <WizardField
          id="bike-odometer"
          label={t("odometer.labelWithUnit", { unit: u.unitLabel })}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={draft.odometerKm}
          onChange={(e) => patch({ odometerKm: e.target.value })}
          onFocus={(e) => e.target.select()}
          error={errors.odometerKm}
          hint={t("wizard.distance.newStartsAtZero")}
        />
      )}
      {connectFailed && (
        <p role="alert" className="text-destructive text-sm">
          {t("wizard.distance.connectFailed")}
        </p>
      )}
      {strava.configured && !strava.connected && !connectFailed && (
        <p className="text-muted-foreground text-sm">
          {rich(t("wizard.distance.offerConnect"), {
            link: (text) => (
              <a
                href={`/api/strava/connect?next=${encodeURIComponent("/bikes/new")}`}
                className="text-foreground font-medium underline"
              >
                {text}
              </a>
            ),
          })}
        </p>
      )}
    </>
  );
}

export function StepPurchase({ draft, errors, dispatch, today, headingRef }: StepProps) {
  const t = useT();
  const u = useUnits();
  const patch = (p: Partial<WizardDraft>) => dispatch({ type: "patch", patch: p });
  const todayDate = parseISO(today);
  const quickPicks = [
    {
      key: "month",
      label: t("wizard.purchase.thisMonth"),
      value: formatISO(startOfMonth(todayDate), { representation: "date" }),
    },
    {
      key: "year",
      label: t("wizard.purchase.thisYear"),
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
        title={t("wizard.purchase.title")}
        intro={t("wizard.purchase.intro")}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("wizard.purchase.date")}</legend>
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
            {t("wizard.purchase.pickDate")}
          </ChoiceChip>
        </div>
        {mode === "date" ? (
          <WizardField
            id="bike-purchased"
            label={t("wizard.purchase.date")}
            type="date"
            max={today}
            value={draft.purchasedAt}
            onChange={(e) => patch({ purchasedAt: e.target.value })}
            error={errors.purchasedAt}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("wizard.purchase.countedFrom", { date: u.date(draft.purchasedAt, "d MMMM yyyy") })}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t("wizard.purchase.wasItNew")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceChip
            name="condition"
            checked={draft.condition === "new"}
            onChange={() => patch({ condition: "new" })}
          >
            {t("wizard.purchase.new")}
          </ChoiceChip>
          <ChoiceChip
            name="condition"
            checked={draft.condition === "used"}
            onChange={() => patch({ condition: "used" })}
          >
            {t("wizard.purchase.used")}
          </ChoiceChip>
        </div>
        {draft.condition === "used" && (
          <WizardField
            id="bike-purchase-km"
            label={t("wizard.purchase.odometerAtPurchase", { unit: u.unitLabel })}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft.purchaseKm}
            onChange={(e) => patch({ purchaseKm: e.target.value })}
            onFocus={(e) => e.target.select()}
            error={errors.purchaseKm}
            hint={t("wizard.purchase.odometerAtPurchaseHint", { unit: u.unitLabel })}
          />
        )}
      </fieldset>

      <WizardField
        id="bike-price"
        label={t("bikeForm.pricePaidOptional", { currency: u.currencySymbol })}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={draft.purchasePrice}
        onChange={(e) => patch({ purchasePrice: e.target.value })}
        error={errors.purchasePrice}
        hint={t("wizard.purchase.priceHint")}
      />
    </>
  );
}

export function StepParts({ draft, errors, dispatch, today, headingRef }: StepProps) {
  const t = useT();
  const u = useUnits();
  const [showIntervals, setShowIntervals] = useState(
    Object.keys(errors).some((k) => /\.(service|replace)(Km|Months)$/.test(k)),
  );
  const indexOf = new Map(draft.parts.map((p, i) => [p.kind, i]));
  const included = draft.parts.filter((p) => p.included).length;
  const fromKm = startKm(draft);

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title={t("wizard.parts.title")}
        intro={t("wizard.parts.intro")}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("wizard.parts.count", { count: draft.parts.length, included })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showIntervals}
          onClick={() => setShowIntervals((v) => !v)}
        >
          {t("wizard.parts.advanced")}
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

      {partsByCategory(draft.type, draft.brakeType, draft.tireType).map(([category, templates]) => (
        <fieldset key={category} className="flex flex-col gap-1.5">
          <legend className="text-muted-foreground mb-1.5 px-1 text-sm font-medium">
            {t(`categories.${category}`)}
          </legend>
          <ul className="divide-y overflow-hidden rounded-xl border">
            {templates.map((template) => {
              const i = indexOf.get(template.kind)!;
              const choice = draft.parts[i]!;
              const err = (field: string) => errors[`parts.${i}.${field}`];
              const set = (patch: Partial<typeof choice>) =>
                dispatch({ type: "part", kind: template.kind, patch });
              const id = `part-${template.kind}`;
              return (
                <li key={template.kind} className={cn(!choice.included && "bg-muted/40")}>
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
                        {partName(template, t)}
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
                        {t("wizard.parts.replacedSince")}
                      </label>
                    )}
                  </div>

                  {choice.included && (choice.replaced || showIntervals) && (
                    <div className="flex flex-col gap-3 px-3 pb-3 sm:pl-11">
                      {choice.replaced && (
                        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                          <WizardField
                            id={`${id}-replaced-at`}
                            label={t("wizard.parts.replacedOn")}
                            type="date"
                            min={draft.purchasedAt}
                            max={today}
                            value={choice.replacedAt}
                            onChange={(e) => set({ replacedAt: e.target.value })}
                            error={err("replacedAt")}
                          />
                          <WizardField
                            id={`${id}-replaced-km`}
                            label={t("wizard.parts.atDistance", { unit: u.unitLabel })}
                            type="number"
                            inputMode="decimal"
                            min={fromKm}
                            step="any"
                            value={choice.replacedKm}
                            onChange={(e) => set({ replacedKm: e.target.value })}
                            placeholder={t("wizard.parts.estimate")}
                            error={err("replacedKm")}
                            hint={t("wizard.parts.estimateHint")}
                          />
                        </div>
                      )}
                      {showIntervals && (
                        <div className="grid grid-cols-2 gap-3">
                          <WizardField
                            id={`${id}-service-km`}
                            label={t("wizard.parts.serviceEvery", { unit: u.unitLabel })}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.serviceKm}
                            onChange={(e) => set({ serviceKm: e.target.value })}
                            placeholder={t("wizard.parts.none")}
                            error={err("serviceKm")}
                          />
                          <WizardField
                            id={`${id}-service-months`}
                            label={t("part.fields.everyMonths")}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.serviceMonths}
                            onChange={(e) => set({ serviceMonths: e.target.value })}
                            placeholder={t("wizard.parts.none")}
                            error={err("serviceMonths")}
                          />
                          <WizardField
                            id={`${id}-replace-km`}
                            label={t("wizard.parts.replaceAfter", { unit: u.unitLabel })}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.replaceKm}
                            onChange={(e) => set({ replaceKm: e.target.value })}
                            placeholder={t("wizard.parts.none")}
                            error={err("replaceKm")}
                          />
                          <WizardField
                            id={`${id}-replace-months`}
                            label={t("part.fields.afterMonths")}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={choice.replaceMonths}
                            onChange={(e) => set({ replaceMonths: e.target.value })}
                            placeholder={t("wizard.parts.none")}
                            error={err("replaceMonths")}
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
  const t = useT();
  const u = useUnits();
  /** A distance as typed in the draft, in the draft's unit. */
  const typed = (value: number) =>
    formatDistance(fromUnit(value, draft.unit), draft.unit, u.locale);
  const stravaBike = strava.bikes.find((b) => b.id === draft.stravaGearId);
  const templates = new Map(
    defaultPartsFor(draft.type, draft.brakeType, draft.tireType).map((t) => [t.kind, t]),
  );
  const chosen = draft.parts.filter((p) => p.included);
  const replaced = chosen.filter((p) => p.replaced).length;
  const makeModel = [draft.brand, draft.model].filter((s) => s.trim()).join(" ");
  const color = frameColors.find((c) => c.value === draft.color.toLowerCase());
  const colorName = color ? t(`colors.${color.id}`) : t("colors.custom");

  const drawingParts = chosen.map((p, i) => {
    const template = templates.get(p.kind)!;
    return {
      id: i,
      name: partName(template, t),
      zone: template.svgZone,
      level: "ok" as const,
      hint:
        p.replaced && p.replacedAt
          ? t("wizard.review.fittedAgo", { age: formatAge(p.replacedAt, new Date(), t) })
          : t("events.cameWithBike"),
    };
  });

  const rows: { label: string; value: string; step: WizardStep }[] = [
    { label: t("bikeForm.type"), value: t(`bikeTypes.${draft.type}.name`), step: "basics" },
    { label: t("bikeForm.brakes"), value: t(`brakeTypes.${draft.brakeType}`), step: "basics" },
    { label: t("bikeForm.tires"), value: t(`tireTypes.${draft.tireType}`), step: "basics" },
    ...(makeModel
      ? [{ label: t("wizard.review.make"), value: makeModel, step: "basics" as const }]
      : []),
    { label: t("bikeForm.frameColor"), value: colorName, step: "basics" },
    {
      label: t("odometer.label"),
      value: stravaBike
        ? t("wizard.review.fromStrava", {
            distance: u.distance(stravaBike.distanceKm),
            bike: stravaBike.name,
          })
        : t("wizard.review.byHand", { distance: typed(Number(draft.odometerKm) || 0) }),
      step: "odometer",
    },
    {
      label: t("bikeForm.gotItOn"),
      value:
        draft.condition === "new"
          ? t("wizard.review.boughtNew", { date: u.date(draft.purchasedAt, "d MMM yyyy") })
          : t("wizard.review.boughtUsed", {
              date: u.date(draft.purchasedAt, "d MMM yyyy"),
              distance: typed(startKm(draft)),
            }),
      step: "purchase",
    },
    ...(draft.purchasePrice !== ""
      ? [
          {
            label: t("wizard.review.price"),
            value: u.money(Number(draft.purchasePrice) || 0),
            step: "purchase" as const,
          },
        ]
      : []),
    {
      label: t("bike.tabs.parts"),
      value: replaced
        ? t("wizard.review.partsReplaced", {
            parts: t("settings.data.parts", { count: chosen.length }),
            count: replaced,
          })
        : t("settings.data.parts", { count: chosen.length }),
      step: "parts",
    },
  ];

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title={t("wizard.review.title")}
        intro={t("wizard.review.intro")}
      />
      <div className="overflow-hidden rounded-2xl border">
        <div className="bg-muted/40 px-3 pt-4 pb-2">
          <ZoneProvider>
            <BikeDrawing parts={drawingParts} color={draft.color} brakeType={draft.brakeType} />
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
                  aria-label={t("wizard.review.editField", { field: row.label.toLowerCase() })}
                >
                  {t("common.edit")}
                </Button>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  );
}
