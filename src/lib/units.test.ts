import { describe, expect, it } from "vitest";
import { defaultPartsFor } from "./default-parts";
import { computeStatus } from "./status";
import {
  currencySymbol,
  formatDistance,
  formatMoney,
  formatMoneyShort,
  fromUnit,
  inputToKm,
  intervalToKm,
  isCurrency,
  niceInterval,
  toInput,
  toUnit,
} from "./units";
import { emptyDraft, partChoicesFor, planBike, validateStep } from "./wizard-schema";

describe("conversion", () => {
  it("converts km and miles both ways", () => {
    expect(toUnit(1.609344, "mi")).toBeCloseTo(1);
    expect(fromUnit(100, "mi")).toBeCloseTo(160.9344);
    expect(toUnit(1234.5, "km")).toBe(1234.5);
    expect(fromUnit(1234.5, "km")).toBe(1234.5);
  });

  it("keeps the stored value when a form is saved unchanged", () => {
    for (const km of [0, 0.4, 8412.37, 12_345.678, 99_999.9]) {
      for (const unit of ["km", "mi"] as const) {
        expect(inputToKm(toInput(km, unit), unit, km)).toBe(km);
      }
    }
  });

  it("converts a changed value, and shows it back as typed", () => {
    const km = inputToKm(5300, "mi", 8412.37);
    expect(km).toBeCloseTo(8529.52, 2);
    expect(toInput(km, "mi")).toBe(5300);
    expect(inputToKm(8500, "km", 8412.37)).toBe(8500);
  });

  it("doesn't drift when an interval is edited and saved again and again", () => {
    for (const miles of [250, 600, 1850, 12_500]) {
      let km = intervalToKm(miles, "mi");
      for (let i = 0; i < 5; i++) km = intervalToKm(toInput(km, "mi"), "mi", km);
      expect(toInput(km, "mi")).toBe(miles);
      expect(Number.isInteger(km)).toBe(true);
    }
  });
});

describe("formatting", () => {
  it("formats distances in the user's unit", () => {
    expect(formatDistance(12_345, "km")).toBe("12,345 km");
    expect(formatDistance(8412.37, "mi")).toBe("5,227 mi");
  });

  it("formats amounts in the user's currency", () => {
    expect(formatMoney(1234.5, "EUR")).toBe("€1,234.50");
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(1234.5, "GBP")).toBe("£1,234.50");
    expect(formatMoney(1234.5, "JPY")).toBe("¥1,235");
    expect(formatMoneyShort(80, "EUR")).toBe("€80");
    expect(formatMoneyShort(12_345, "USD")).toBe("$12.3K");
    expect(currencySymbol("EUR")).toBe("€");
    expect(currencySymbol("CHF")).toBe("CHF");
  });

  it("accepts every ISO currency code and nothing else", () => {
    expect(isCurrency("NZD")).toBe(true);
    expect(isCurrency("XYZ")).toBe(false);
    expect(isCurrency("eur")).toBe(false);
  });

  it("shows status hints in the user's unit", () => {
    const part = {
      installedAt: "2026-01-01",
      installedKm: 0,
      serviceIntervalKm: 1000,
      serviceIntervalDays: null,
      replaceIntervalKm: null,
      replaceIntervalDays: null,
    };
    const now = new Date("2026-02-01");
    expect(computeStatus(part, null, 400, { now }).service?.hint).toBe("in 600 km");
    expect(computeStatus(part, null, 400, { now, unit: "mi" }).service?.hint).toBe("in 373 mi");
  });
});

describe("default intervals in miles", () => {
  it("rounds them the way a person would write them", () => {
    expect(niceInterval(3000, "mi")).toBe(1850);
    expect(niceInterval(400, "mi")).toBe(250);
    expect(niceInterval(20_000, "mi")).toBe(12_500);
    expect(niceInterval(3000, "km")).toBe(3000);
  });

  it("stay close to the km defaults and use round numbers", () => {
    const templates = defaultPartsFor("road", "disc");
    const choices = partChoicesFor("road", "disc", "mi");
    templates.forEach((t, i) => {
      for (const [km, shown] of [
        [t.serviceIntervalKm, choices[i]!.serviceKm],
        [t.replaceIntervalKm, choices[i]!.replaceKm],
      ] as const) {
        if (!km) {
          expect(shown).toBe("");
          continue;
        }
        const miles = Number(shown);
        expect(Math.abs(fromUnit(miles, "mi") - km) / km).toBeLessThan(0.05);
        expect(miles % 10).toBe(0);
      }
    });
  });
});

describe("wizard in miles", () => {
  const TODAY = "2026-10-23";

  it("stores km, and labels its messages in miles", () => {
    const draft = {
      ...emptyDraft(TODAY, "mi"),
      name: "Road",
      odometerKm: "1000",
      condition: "used" as const,
      purchaseKm: "200",
      purchasedAt: "2026-01-01",
    };
    const plan = planBike(draft, TODAY);
    expect(plan.bike.odometerKm).toBeCloseTo(1609.344);
    const chain = plan.parts.find((p) => p.kind === "chain")!;
    expect(chain.installedKm).toBeCloseTo(321.87, 2);
    const chainChoice = draft.parts.find((p) => p.kind === "chain")!;
    expect(chain.serviceIntervalKm).toBe(Math.round(fromUnit(Number(chainChoice.serviceKm), "mi")));

    const parts = draft.parts.map((p) =>
      p.kind === "chain" ? { ...p, replaced: true, replacedAt: "2026-06-01", replacedKm: "50" } : p,
    );
    expect(validateStep("parts", { ...draft, parts }, TODAY)).toEqual({
      "parts.0.replacedKm": "Enter mi between 200 and 1000",
    });
  });
});
