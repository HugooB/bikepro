import type { DistanceUnit } from "@/db/schema";
import type { BikeType, BrakeType, TireType } from "@/db/schema";
import { defaultTireType } from "@/lib/default-parts";
import {
  parseSavedDraft,
  partChoicesFor,
  wizardSteps,
  type PartChoice,
  type WizardDraft,
  type WizardStep,
} from "@/lib/wizard-schema";

export type WizardState = {
  step: WizardStep;
  draft: WizardDraft;
  /** Field errors of the current step, keyed by path ("name", "parts.3.replacedAt"). */
  errors: Record<string, string>;
};

export type WizardAction =
  | { type: "patch"; patch: Partial<WizardDraft> }
  | { type: "bikeType"; bikeType: BikeType }
  | { type: "brakeType"; brakeType: BrakeType }
  | { type: "tireType"; tireType: TireType }
  | { type: "part"; kind: string; patch: Partial<PartChoice> }
  | { type: "goto"; step: WizardStep }
  | { type: "errors"; errors: Record<string, string> }
  | { type: "restore"; state: Pick<WizardState, "step" | "draft"> };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "patch":
      return { ...state, draft: { ...state.draft, ...action.patch }, errors: {} };
    case "bikeType":
    case "brakeType":
    case "tireType": {
      const type = action.type === "bikeType" ? action.bikeType : state.draft.type;
      const brakeType = action.type === "brakeType" ? action.brakeType : state.draft.brakeType;
      // A new bike type brings its own default tires, unless the user already picked other ones.
      const tireType =
        action.type === "tireType"
          ? action.tireType
          : action.type === "bikeType" && state.draft.tireType === defaultTireType(state.draft.type)
            ? defaultTireType(type)
            : state.draft.tireType;
      // Keep what was already chosen for parts the new template shares.
      const previous = new Map(state.draft.parts.map((p) => [p.kind, p]));
      const parts = partChoicesFor(type, brakeType, tireType, state.draft.unit).map(
        (p) => previous.get(p.kind) ?? p,
      );
      return {
        ...state,
        draft: { ...state.draft, type, brakeType, tireType, parts },
        errors: {},
      };
    }
    case "part":
      return {
        ...state,
        draft: {
          ...state.draft,
          parts: state.draft.parts.map((p) =>
            p.kind === action.kind ? { ...p, ...action.patch } : p,
          ),
        },
        errors: {},
      };
    case "goto":
      return { ...state, step: action.step, errors: {} };
    case "errors":
      return { ...state, errors: action.errors };
    case "restore":
      return { ...action.state, errors: {} };
  }
}

export const stepIndex = (step: WizardStep) => wizardSteps.indexOf(step);

// The draft survives a page refresh (and, from M8, the Strava sign-in redirect).
const STORAGE_KEY = "bikepro:new-bike";
const STORAGE_VERSION = 1;

export function loadSavedWizard(unit: DistanceUnit): Pick<WizardState, "step" | "draft"> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.v !== STORAGE_VERSION || !wizardSteps.includes(saved.step)) return null;
    // Anything malformed (an old format, a hand edit) starts a fresh draft instead.
    const draft = parseSavedDraft(saved.draft, unit);
    return draft ? { step: saved.step, draft } : null;
  } catch {
    return null;
  }
}

export function saveWizard(state: WizardState) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: STORAGE_VERSION, step: state.step, draft: state.draft }),
    );
  } catch {
    // Storage can be full or blocked; the wizard still works without it.
  }
}

export function clearSavedWizard() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
