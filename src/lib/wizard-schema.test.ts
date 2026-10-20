import { describe, expect, it } from "vitest";
import { defaultPartsFor } from "./default-parts";
import {
  emptyDraft,
  estimateKm,
  parseSavedDraft,
  partChoicesFor,
  planBike,
  validateStep,
  WizardDraftError,
  type WizardDraft,
} from "./wizard-schema";

const TODAY = "2026-10-20";

function draft(patch: Partial<WizardDraft> = {}): WizardDraft {
  return { ...emptyDraft(TODAY), name: "Gravel grinder", ...patch };
}

describe("validateStep", () => {
  it("asks for a name", () => {
    expect(validateStep("basics", draft({ name: "  " }), TODAY)).toEqual({
      name: "Give your bike a name",
    });
  });

  it("accepts the defaults on every step once the bike has a name", () => {
    for (const step of ["basics", "odometer", "purchase", "parts", "review"] as const) {
      expect(validateStep(step, draft(), TODAY)).toBeNull();
    }
  });

  it("rejects a future purchase date and a used bike with more km than now", () => {
    expect(validateStep("purchase", draft({ purchasedAt: "2027-01-01" }), TODAY)).toHaveProperty(
      "purchasedAt",
    );
    const used = draft({ condition: "used", purchaseKm: "5000", odometerKm: "4000" });
    expect(validateStep("purchase", used, TODAY)).toEqual({
      purchaseKm: "That's more than the bike's odometer now",
    });
  });

  it("checks replacement dates and km against the purchase and today", () => {
    const parts = partChoicesFor("road");
    parts[0] = { ...parts[0], replaced: true, replacedAt: "2025-01-01", replacedKm: "9000" };
    const errors = validateStep(
      "parts",
      draft({ purchasedAt: "2026-01-01", odometerKm: "3000", parts }),
      TODAY,
    );
    expect(errors).toEqual({
      "parts.0.replacedAt": "Pick a date between buying the bike and today",
      "parts.0.replacedKm": "Enter km between 0 and 3000",
    });
  });

  it("needs at least one part", () => {
    const parts = partChoicesFor("road").map((p) => ({ ...p, included: false }));
    expect(validateStep("parts", draft({ parts }), TODAY)).toEqual({
      parts: "Keep at least one part",
    });
  });
});

describe("planBike", () => {
  it("leaves out unticked parts and ages replaced ones from when they were fitted", () => {
    const parts = partChoicesFor("gravel").map((p) => {
      if (p.kind === "rotors" || p.kind === "sealant") return { ...p, included: false };
      if (p.kind === "chain")
        return { ...p, replaced: true, replacedAt: "2026-09-20", replacedKm: "2400" };
      return p;
    });
    const plan = planBike(
      draft({
        type: "gravel",
        purchasedAt: "2025-10-20",
        odometerKm: "2600",
        color: "#d14b2f",
        parts,
      }),
      TODAY,
    );

    expect(plan.bike).toMatchObject({
      name: "Gravel grinder",
      type: "gravel",
      brand: null,
      color: "#d14b2f",
      purchasedAt: "2025-10-20",
      odometerKm: 2600,
    });
    const kinds = plan.parts.map((p) => p.kind);
    expect(kinds).not.toContain("rotors");
    expect(kinds).not.toContain("sealant");
    expect(plan.parts).toHaveLength(defaultPartsFor("gravel").length - 2);
    expect(plan.parts.find((p) => p.kind === "chain")).toMatchObject({
      installedAt: "2026-09-20",
      installedKm: 2400,
      replaced: true,
      intervalKm: 3000,
      intervalDays: 365,
    });
    expect(plan.parts.find((p) => p.kind === "cassette")).toMatchObject({
      installedAt: "2025-10-20",
      installedKm: 0,
      replaced: false,
    });
  });

  it("starts a used bike's parts at the km it was bought with", () => {
    const plan = planBike(
      draft({ condition: "used", purchaseKm: "12000", odometerKm: "15000" }),
      TODAY,
    );
    expect(plan.parts.every((p) => p.installedKm === 12000)).toBe(true);
  });

  it("estimates the km of a replacement without a reading", () => {
    const parts = partChoicesFor("road").map((p) =>
      p.kind === "tire_rear" ? { ...p, replaced: true, replacedAt: "2026-04-20" } : p,
    );
    const plan = planBike(draft({ purchasedAt: "2025-10-20", odometerKm: "3650", parts }), TODAY);
    // Halfway through the year since purchase, so about half the km.
    expect(plan.parts.find((p) => p.kind === "tire_rear")?.installedKm).toBe(1820);
  });

  it("uses edited intervals and drops cleared ones", () => {
    const parts = partChoicesFor("road").map((p) =>
      p.kind === "chain" ? { ...p, intervalKm: "4000", intervalMonths: "" } : p,
    );
    const chain = planBike(draft({ parts }), TODAY).parts.find((p) => p.kind === "chain");
    expect(chain).toMatchObject({ intervalKm: 4000, intervalDays: undefined });
  });

  it("keeps the purchase price when given and checks it", () => {
    expect(planBike(draft(), TODAY).bike.purchasePrice).toBeNull();
    expect(planBike(draft({ purchasePrice: "2499.95" }), TODAY).bike.purchasePrice).toBe(2499.95);
    expect(validateStep("purchase", draft({ purchasePrice: "-1" }), TODAY)).toEqual({
      purchasePrice: "The price can't be negative",
    });
  });

  it("refuses an incomplete draft and names the step to fix", () => {
    expect(() => planBike(draft({ name: "" }), TODAY)).toThrow(WizardDraftError);
    try {
      planBike(draft({ odometerKm: "-5" }), TODAY);
    } catch (e) {
      expect((e as WizardDraftError).step).toBe("odometer");
    }
  });
});

describe("estimateKm", () => {
  it("interpolates and clamps to the known readings", () => {
    expect(estimateKm("2026-01-01", 1000, "2026-01-11", 2000, "2026-01-06")).toBe(1500);
    expect(estimateKm("2026-01-01", 1000, "2026-01-11", 2000, "2027-01-01")).toBe(2000);
    expect(estimateKm("2026-01-01", 1000, "2026-01-01", 2000, "2026-01-01")).toBe(2000);
  });
});

describe("impossible dates", () => {
  it("rejects calendar dates that don't exist", () => {
    expect(validateStep("purchase", draft({ purchasedAt: "2026-02-31" }), TODAY)).toEqual({
      purchasedAt: "Pick a date",
    });
    const parts = partChoicesFor("road");
    parts[0] = { ...parts[0], replaced: true, replacedAt: "2025-13-01" };
    expect(validateStep("parts", draft({ purchasedAt: "2025-01-01", parts }), TODAY)).toEqual({
      "parts.0.replacedAt": "Pick when it was replaced",
    });
  });
});

describe("parseSavedDraft", () => {
  it("restores a valid draft", () => {
    const saved = draft({ name: "Saved" });
    expect(parseSavedDraft(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("rejects malformed drafts", () => {
    expect(parseSavedDraft(null)).toBeNull();
    expect(parseSavedDraft({ ...draft(), parts: "zzz" })).toBeNull();
    expect(parseSavedDraft({ ...draft(), type: "unicycle" })).toBeNull();
  });

  it("lines parts up with the template", () => {
    const parts = partChoicesFor("road");
    const chain = { ...parts[0], included: false };
    const restored = parseSavedDraft({ ...draft(), parts: [{ ...chain, kind: "gone" }, chain] })!;
    expect(restored.parts.map((p) => p.kind)).toEqual(partChoicesFor("road").map((p) => p.kind));
    expect(restored.parts[0]).toEqual(chain);
  });
});
