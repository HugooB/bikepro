import { differenceInCalendarDays, parseISO } from "date-fns";
import { z } from "zod";
import {
  brakeTypes,
  bikeTypes,
  distanceUnits,
  tireTypes,
  type BikeType,
  type BrakeType,
  type DistanceUnit,
  type PartCategory,
  type TireType,
} from "@/db/schema";
import { tEn, type T } from "@/i18n";
import { defaultPartsFor, type PartTemplate } from "./default-parts";
import { dateField, isoDate } from "./dates";
import { daysToMonths, monthsToDays } from "./format";
import { fromUnit, niceInterval, unitName } from "./units";

// The add-bike wizard collects a draft over five steps; nothing is saved until the last one.
// Each step validates its own slice of the draft, and the server re-validates the whole thing.
// Schemas take `t`, so their messages are in the user's language.
// Distances in a draft are in its `unit`, as the user typed them; planBike converts them to km.

export const wizardSteps = ["basics", "odometer", "purchase", "parts", "review"] as const;
export type WizardStep = (typeof wizardSteps)[number];

export type PartChoice = {
  kind: string;
  included: boolean;
  /** Fitted since the bike was bought, so it is younger than the bike. */
  replaced: boolean;
  replacedAt: string;
  /** Odometer when it was fitted; empty means "estimate it". Distances are in the draft's unit. */
  replacedKm: string;
  /** Service interval: every … km and/or months. */
  serviceKm: string;
  serviceMonths: string;
  /** Replacement interval: after … km and/or months. */
  replaceKm: string;
  replaceMonths: string;
};

export type WizardDraft = {
  name: string;
  type: BikeType;
  brakeType: BrakeType;
  tireType: TireType;
  brand: string;
  model: string;
  /** Frame color for the drawing; empty uses the brand color. */
  color: string;
  odometerKm: string;
  purchasedAt: string;
  condition: "new" | "used";
  /** Odometer when a used bike was bought. */
  purchaseKm: string;
  /** What was paid for it in euros; empty when not given. */
  purchasePrice: string;
  parts: PartChoice[];
  /** Strava bike to link; its total distance becomes the odometer. Empty when typed by hand. */
  stravaGearId: string;
  /** The unit of every distance in this draft: the user's unit when they started it. */
  unit: DistanceUnit;
};

/** Template parts as wizard choices: everything ticked, default intervals in `unit`. */
export function partChoicesFor(
  type: BikeType,
  brakes: BrakeType = "disc",
  tires: TireType = "tubeless",
  unit: DistanceUnit = "km",
): PartChoice[] {
  const distance = (km: number | undefined) => (km ? String(niceInterval(km, unit)) : "");
  return defaultPartsFor(type, brakes, tires).map((t) => ({
    kind: t.kind,
    included: true,
    replaced: false,
    replacedAt: "",
    replacedKm: "",
    serviceKm: distance(t.serviceIntervalKm),
    serviceMonths: t.serviceIntervalDays ? String(daysToMonths(t.serviceIntervalDays)) : "",
    replaceKm: distance(t.replaceIntervalKm),
    replaceMonths: t.replaceIntervalDays ? String(daysToMonths(t.replaceIntervalDays)) : "",
  }));
}

// Shape only, no business rules: used to check a draft read back from browser storage.
const savedDraftSchema = z.object({
  name: z.string(),
  type: z.enum(bikeTypes),
  brakeType: z.enum(brakeTypes),
  tireType: z.enum(tireTypes),
  brand: z.string(),
  model: z.string(),
  color: z.string(),
  odometerKm: z.string(),
  purchasedAt: z.string(),
  condition: z.enum(["new", "used"]),
  purchaseKm: z.string(),
  purchasePrice: z.string(),
  stravaGearId: z.string(),
  unit: z.enum(distanceUnits),
  parts: z.array(
    z.object({
      kind: z.string(),
      included: z.boolean(),
      replaced: z.boolean(),
      replacedAt: z.string(),
      replacedKm: z.string(),
      serviceKm: z.string(),
      serviceMonths: z.string(),
      replaceKm: z.string(),
      replaceMonths: z.string(),
    }),
  ),
});

/**
 * A saved draft if it still has the expected shape and was made in `unit`, else null. Its
 * parts are lined up with the current template, so a part added or removed since it was saved
 * can't break the form.
 */
export function parseSavedDraft(value: unknown, unit: DistanceUnit = "km"): WizardDraft | null {
  const parsed = savedDraftSchema.safeParse(value);
  // A draft in the other unit would show its numbers with the wrong label: start afresh.
  if (!parsed.success || parsed.data.unit !== unit) return null;
  const draft = parsed.data;
  const saved = new Map(draft.parts.map((p) => [p.kind, p]));
  return {
    ...draft,
    parts: partChoicesFor(draft.type, draft.brakeType, draft.tireType, unit).map(
      (p) => saved.get(p.kind) ?? p,
    ),
  };
}

export function emptyDraft(today: string, unit: DistanceUnit = "km"): WizardDraft {
  return {
    name: "",
    type: "road",
    brakeType: "disc",
    tireType: "tubeless",
    brand: "",
    model: "",
    color: "",
    odometerKm: "0",
    purchasedAt: today,
    condition: "new",
    purchaseKm: "0",
    purchasePrice: "",
    parts: partChoicesFor("road", "disc", "tubeless", unit),
    stravaGearId: "",
    unit,
  };
}

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** A distance someone types, in whichever unit they use. `enter` asks for it when it's missing. */
export const distanceField = (t: T, enter: string) =>
  z.coerce
    .number({ error: enter })
    .min(0, t("validation.distanceNegative"))
    .max(1_000_000, t("validation.distanceTooLarge"));

/** An optional whole number, such as an interval; `label` names it in messages. */
const optionalWhole = (t: T, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: t("validation.mustBeNumber", { label }) })
      .int(t("validation.mustBeWhole", { label }))
      .positive(t("validation.mustBePositive", { label }))
      .optional(),
  );

/** An optional price: empty means not given. */
export const optionalPrice = (t: T) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: t("validation.priceNumber") })
      .min(0, t("validation.priceNegative"))
      .max(1_000_000, t("validation.priceTooLarge"))
      .optional(),
  );

export const basicsSchema = (t: T) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("wizard.errors.nameRequired"))
      .max(40, t("wizard.errors.nameTooLong")),
    type: z.enum(bikeTypes, { error: t("wizard.errors.chooseType") }),
    brakeType: z.enum(brakeTypes, { error: t("wizard.errors.chooseBrakes") }),
    tireType: z.enum(tireTypes, { error: t("wizard.errors.chooseTires") }),
    brand: z.string().trim().max(60),
    model: z.string().trim().max(80),
    color: z.union([
      z.literal(""),
      z.string().regex(/^#[0-9a-f]{6}$/i, t("wizard.errors.pickColor")),
    ]),
  });

export const odometerSchema = (t: T) =>
  z.object({ odometerKm: distanceField(t, t("validation.enterOdometer")) });

export const purchaseSchema = (t: T, today: string) =>
  z
    .object({
      purchasedAt: dateField(t).refine((d) => d <= today, t("wizard.errors.purchaseInFuture")),
      condition: z.enum(["new", "used"]),
      purchaseKm: distanceField(t, t("wizard.errors.enterPurchaseOdometer")),
      odometerKm: distanceField(t, t("validation.enterOdometer")),
      purchasePrice: optionalPrice(t),
    })
    .refine((d) => d.condition === "new" || d.purchaseKm <= d.odometerKm, {
      message: t("wizard.errors.moreThanOdometer"),
      path: ["purchaseKm"],
    });

const partChoiceSchema = (t: T) =>
  z.object({
    kind: z.string(),
    included: z.boolean(),
    replaced: z.boolean(),
    replacedAt: z.string(),
    replacedKm: z.string(),
    serviceKm: optionalWhole(t, t("validation.labels.serviceDistance")),
    serviceMonths: optionalWhole(t, t("validation.labels.serviceMonths")),
    replaceKm: optionalWhole(t, t("validation.labels.replaceDistance")),
    replaceMonths: optionalWhole(t, t("validation.labels.replaceMonths")),
  });

export const partsSchema = (
  t: T,
  today: string,
  purchasedAt: string,
  startKm: number,
  odometerKm: number,
  unit: DistanceUnit = "km",
) =>
  z.object({
    parts: z
      .array(partChoiceSchema(t))
      .refine((parts) => parts.some((p) => p.included), t("wizard.errors.keepOnePart"))
      .superRefine((parts, ctx) => {
        parts.forEach((p, i) => {
          if (!p.included || !p.replaced) return;
          const at = isoDate.safeParse(p.replacedAt);
          if (!at.success) {
            ctx.addIssue({
              code: "custom",
              message: t("wizard.errors.pickReplacedDate"),
              path: [i, "replacedAt"],
            });
          } else if (p.replacedAt < purchasedAt || p.replacedAt > today) {
            ctx.addIssue({
              code: "custom",
              message: t("wizard.errors.replacedDateRange"),
              path: [i, "replacedAt"],
            });
          }
          if (p.replacedKm === "") return;
          const kmAt = Number(p.replacedKm);
          if (!Number.isFinite(kmAt) || kmAt < startKm || kmAt > odometerKm) {
            ctx.addIssue({
              code: "custom",
              message: t("wizard.errors.replacedKmRange", {
                unit: unitName(unit),
                min: Math.round(startKm),
                max: Math.round(odometerKm),
              }),
              path: [i, "replacedKm"],
            });
          }
        });
      }),
  });

/** Odometer the bike had when it was bought, in the draft's unit. */
export function startKm(draft: Pick<WizardDraft, "condition" | "purchaseKm">): number {
  return draft.condition === "used" ? Number(draft.purchaseKm) || 0 : 0;
}

/**
 * Validates one step; returns field errors keyed by path ("name", "parts.3.replacedAt"), in
 * the language of `t`.
 */
export function validateStep(step: WizardStep, draft: WizardDraft, today: string, t: T = tEn) {
  const result = stepSchema(step, draft, today, t).safeParse(draft);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || step;
    errors[key] ??= issue.message;
  }
  return errors;
}

function stepSchema(step: WizardStep, draft: WizardDraft, today: string, t: T): z.ZodType {
  switch (step) {
    case "basics":
      return basicsSchema(t);
    case "odometer":
      return odometerSchema(t);
    case "purchase":
      return purchaseSchema(t, today);
    case "parts":
      return partsSchema(
        t,
        today,
        draft.purchasedAt,
        startKm(draft),
        Number(draft.odometerKm) || 0,
        draft.unit,
      );
    case "review":
      return z.any();
  }
}

export type PlannedPart = PartTemplate & {
  installedAt: string;
  installedKm: number;
  sortOrder: number;
  replaced: boolean;
};

export type BikePlan = {
  bike: {
    name: string;
    type: BikeType;
    brakeType: BrakeType;
    tireType: TireType;
    brand: string | null;
    model: string | null;
    color: string | null;
    purchasedAt: string;
    purchasePrice: number | null;
    odometerKm: number;
    stravaGearId?: string;
    stravaDistanceKm?: number;
  };
  parts: PlannedPart[];
};

/** Thrown when a draft doesn't pass validation; `step` is where the user can fix it. */
export class WizardDraftError extends Error {
  constructor(
    readonly step: WizardStep,
    /** Already translated: the first problem on that step. */
    message: string,
  ) {
    super(message);
  }
}

/**
 * Validates a complete draft and turns it into the bike and part rows to create. Parts start
 * at the purchase date and km, except parts replaced since then, which start when they were
 * fitted. A replacement without km gets an estimate from the average riding since purchase.
 * Distances are converted from the draft's unit to km.
 */
export function planBike(draft: WizardDraft, today: string, t: T = tEn): BikePlan {
  for (const step of wizardSteps) {
    const errors = validateStep(step, draft, today, t);
    if (errors) {
      throw new WizardDraftError(step, Object.values(errors)[0] ?? t("wizard.errors.checkStep"));
    }
  }

  const basics = basicsSchema(t).parse(draft);
  const km = (value: number) => fromUnit(value, draft.unit);
  const wholeKm = (value: number | undefined) => (value ? Math.round(km(value)) : undefined);
  const odometerKm = km(Number(draft.odometerKm));
  const fromKm = km(startKm(draft));
  const choices = new Map(draft.parts.map((p) => [p.kind, p]));

  const parts = defaultPartsFor(basics.type, basics.brakeType, basics.tireType).flatMap(
    (template, i): PlannedPart[] => {
      const choice = choices.get(template.kind);
      if (!choice?.included) return [];
      const intervals = partChoiceSchema(t).parse(choice);
      const replaced = choice.replaced;
      return [
        {
          ...template,
          installedAt: replaced ? choice.replacedAt : draft.purchasedAt,
          installedKm: replaced
            ? choice.replacedKm === ""
              ? estimateKm(draft.purchasedAt, fromKm, today, odometerKm, choice.replacedAt)
              : km(Number(choice.replacedKm))
            : fromKm,
          serviceIntervalKm: wholeKm(intervals.serviceKm),
          serviceIntervalDays: intervals.serviceMonths
            ? monthsToDays(intervals.serviceMonths)
            : undefined,
          replaceIntervalKm: wholeKm(intervals.replaceKm),
          replaceIntervalDays: intervals.replaceMonths
            ? monthsToDays(intervals.replaceMonths)
            : undefined,
          sortOrder: i,
          replaced,
        },
      ];
    },
  );

  return {
    bike: {
      name: basics.name,
      type: basics.type,
      brakeType: basics.brakeType,
      tireType: basics.tireType,
      brand: basics.brand || null,
      model: basics.model || null,
      color: basics.color || null,
      purchasedAt: draft.purchasedAt,
      purchasePrice: optionalPrice(t).parse(draft.purchasePrice) ?? null,
      odometerKm,
    },
    parts,
  };
}

/** Odometer on `date`, assuming the km since purchase were ridden at an even pace. */
export function estimateKm(
  fromDate: string,
  fromKm: number,
  toDate: string,
  toKm: number,
  date: string,
): number {
  const span = differenceInCalendarDays(parseISO(toDate), parseISO(fromDate));
  if (span <= 0) return toKm;
  const share = differenceInCalendarDays(parseISO(date), parseISO(fromDate)) / span;
  return Math.round(fromKm + (toKm - fromKm) * Math.min(1, Math.max(0, share)));
}

export function partsByCategory(
  type: BikeType,
  brakes: BrakeType,
  tires: TireType,
): [PartCategory, PartTemplate[]][] {
  const groups = new Map<PartCategory, PartTemplate[]>();
  for (const t of defaultPartsFor(type, brakes, tires))
    groups.set(t.category, [...(groups.get(t.category) ?? []), t]);
  return [...groups];
}
