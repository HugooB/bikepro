import { differenceInCalendarDays, parseISO } from "date-fns";
import { z } from "zod";
import {
  brakeTypes,
  bikeTypes,
  distanceUnits,
  type BikeType,
  type BrakeType,
  type DistanceUnit,
  type PartCategory,
} from "@/db/schema";
import { defaultPartsFor, type PartTemplate } from "./default-parts";
import { isoDate } from "./dates";
import { daysToMonths, monthsToDays } from "./format";
import { fromUnit, niceInterval, unitName } from "./units";

// The add-bike wizard collects a draft over five steps; nothing is saved until the last one.
// Each step validates its own slice of the draft, and the server re-validates the whole thing.
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
  brand: string;
  model: string;
  /** Frame colour for the drawing; empty uses the brand colour. */
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
  unit: DistanceUnit = "km",
): PartChoice[] {
  const distance = (km: number | undefined) => (km ? String(niceInterval(km, unit)) : "");
  return defaultPartsFor(type, brakes).map((t) => ({
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
  // Drafts saved before brake types existed don't have it.
  brakeType: z.enum(brakeTypes).default("disc"),
  brand: z.string(),
  model: z.string(),
  color: z.string(),
  odometerKm: z.string(),
  purchasedAt: z.string(),
  condition: z.enum(["new", "used"]),
  purchaseKm: z.string(),
  purchasePrice: z.string().default(""),
  // Drafts saved before Strava linking existed don't have it.
  stravaGearId: z.string().default(""),
  // Drafts saved before distance units existed were in km.
  unit: z.enum(distanceUnits).default("km"),
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
    parts: partChoicesFor(draft.type, draft.brakeType, unit).map((p) => saved.get(p.kind) ?? p),
  };
}

export function emptyDraft(today: string, unit: DistanceUnit = "km"): WizardDraft {
  return {
    name: "",
    type: "road",
    brakeType: "disc",
    brand: "",
    model: "",
    color: "",
    odometerKm: "0",
    purchasedAt: today,
    condition: "new",
    purchaseKm: "0",
    purchasePrice: "",
    parts: partChoicesFor("road", "disc", unit),
    stravaGearId: "",
    unit,
  };
}

/** A distance someone types, in whichever unit they use. */
export const distanceField = (label: string) =>
  z.coerce
    .number({ error: `Enter ${label}` })
    .min(0, "Distances can't be negative")
    .max(1_000_000, "That's a lot of riding");
const optionalWhole = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .positive(`${label} must be more than 0`)
      .optional(),
  );

/** An optional price in euros: empty means not given. */
export const optionalPrice = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce
    .number({ error: "Enter the price as a number" })
    .min(0, "The price can't be negative")
    .max(1_000_000, "That's a lot for a bike")
    .optional(),
);

export const basicsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your bike a name")
    .max(40, "Keep the name under 40 characters"),
  type: z.enum(bikeTypes, { error: "Choose a bike type" }),
  brakeType: z.enum(brakeTypes, { error: "Choose the brakes" }),
  brand: z.string().trim().max(60),
  model: z.string().trim().max(80),
  color: z.union([z.literal(""), z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a colour")]),
});

export const odometerSchema = z.object({ odometerKm: distanceField("the odometer") });

export const purchaseSchema = (today: string) =>
  z
    .object({
      purchasedAt: isoDate.refine((d) => d <= today, "The purchase date can't be in the future"),
      condition: z.enum(["new", "used"]),
      purchaseKm: distanceField("the odometer when you bought it"),
      odometerKm: distanceField("the odometer"),
      purchasePrice: optionalPrice,
    })
    .refine((d) => d.condition === "new" || d.purchaseKm <= d.odometerKm, {
      message: "That's more than the bike's odometer now",
      path: ["purchaseKm"],
    });

const partChoiceSchema = z.object({
  kind: z.string(),
  included: z.boolean(),
  replaced: z.boolean(),
  replacedAt: z.string(),
  replacedKm: z.string(),
  serviceKm: optionalWhole("Service distance"),
  serviceMonths: optionalWhole("Service months"),
  replaceKm: optionalWhole("Replacement distance"),
  replaceMonths: optionalWhole("Replacement months"),
});

export const partsSchema = (
  today: string,
  purchasedAt: string,
  startKm: number,
  odometerKm: number,
  unit: DistanceUnit = "km",
) =>
  z.object({
    parts: z
      .array(partChoiceSchema)
      .refine((parts) => parts.some((p) => p.included), "Keep at least one part")
      .superRefine((parts, ctx) => {
        parts.forEach((p, i) => {
          if (!p.included || !p.replaced) return;
          const at = isoDate.safeParse(p.replacedAt);
          if (!at.success) {
            ctx.addIssue({
              code: "custom",
              message: "Pick when it was replaced",
              path: [i, "replacedAt"],
            });
          } else if (p.replacedAt < purchasedAt || p.replacedAt > today) {
            ctx.addIssue({
              code: "custom",
              message: "Pick a date between buying the bike and today",
              path: [i, "replacedAt"],
            });
          }
          if (p.replacedKm === "") return;
          const kmAt = Number(p.replacedKm);
          if (!Number.isFinite(kmAt) || kmAt < startKm || kmAt > odometerKm) {
            ctx.addIssue({
              code: "custom",
              message: `Enter ${unitName(unit)} between ${Math.round(startKm)} and ${Math.round(odometerKm)}`,
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

/** Validates one step; returns field errors keyed by path ("name", "parts.3.replacedAt"). */
export function validateStep(step: WizardStep, draft: WizardDraft, today: string) {
  const result = stepSchema(step, draft, today).safeParse(draft);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || step;
    errors[key] ??= issue.message;
  }
  return errors;
}

function stepSchema(step: WizardStep, draft: WizardDraft, today: string): z.ZodType {
  switch (step) {
    case "basics":
      return basicsSchema;
    case "odometer":
      return odometerSchema;
    case "purchase":
      return purchaseSchema(today);
    case "parts":
      return partsSchema(
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
export function planBike(draft: WizardDraft, today: string): BikePlan {
  for (const step of wizardSteps) {
    const errors = validateStep(step, draft, today);
    if (errors) throw new WizardDraftError(step, Object.values(errors)[0] ?? "Check this step");
  }

  const basics = basicsSchema.parse(draft);
  const km = (value: number) => fromUnit(value, draft.unit);
  const wholeKm = (value: number | undefined) => (value ? Math.round(km(value)) : undefined);
  const odometerKm = km(Number(draft.odometerKm));
  const fromKm = km(startKm(draft));
  const choices = new Map(draft.parts.map((p) => [p.kind, p]));

  const parts = defaultPartsFor(basics.type, basics.brakeType).flatMap(
    (template, i): PlannedPart[] => {
      const choice = choices.get(template.kind);
      if (!choice?.included) return [];
      const intervals = partChoiceSchema.parse(choice);
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
      brand: basics.brand || null,
      model: basics.model || null,
      color: basics.color || null,
      purchasedAt: draft.purchasedAt,
      purchasePrice: optionalPrice.parse(draft.purchasePrice) ?? null,
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
): [PartCategory, PartTemplate[]][] {
  const groups = new Map<PartCategory, PartTemplate[]>();
  for (const t of defaultPartsFor(type, brakes))
    groups.set(t.category, [...(groups.get(t.category) ?? []), t]);
  return [...groups];
}
