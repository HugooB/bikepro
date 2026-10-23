import { describe, expect, it } from "vitest";
import { formatAge, formatDays, kmSince, partLifetime } from "./age";

const now = new Date(2026, 9, 19, 15, 0); // 19 Oct 2026, local time

describe("formatAge", () => {
  it.each([
    ["2026-10-19", "Today"],
    ["2026-10-25", "Today"], // future dates clamp to today
    ["2026-10-18", "1 day"],
    ["2026-10-09", "10 days"],
    ["2026-10-05", "2 wk"],
    ["2026-08-25", "7 wk"],
    ["2026-08-19", "2 mo"],
    ["2026-08-20", "8 wk"], // one day short of 2 full months
    ["2026-03-01", "7 mo"],
    ["2025-10-20", "11 mo"],
    ["2025-10-19", "1y"],
    ["2025-07-10", "1y 3m"],
    ["2023-10-01", "3y"],
  ])("%s → %s", (date, expected) => {
    expect(formatAge(date, now)).toBe(expected);
  });
});

describe("kmSince", () => {
  it("subtracts install km from the odometer", () => {
    expect(kmSince(6200, 8412.6)).toBe(2213);
  });

  it("never returns negative km", () => {
    expect(kmSince(9000, 8000)).toBe(0);
  });
});

describe("formatDays", () => {
  it.each([
    [0, "0 days"],
    [1, "1 day"],
    [13, "13 days"],
    [14, "2 wk"],
    [60, "8 wk"],
    [61, "2 mo"],
    [200, "6 mo"],
    [365, "1y"],
    [500, "1y 4m"],
  ])("%i → %s", (days, expected) => {
    expect(formatDays(days)).toBe(expected);
  });
});

describe("partLifetime", () => {
  it("measures days and km between install and retirement", () => {
    expect(
      partLifetime({
        installedAt: "2025-04-01",
        installedKm: 1200,
        retiredAt: "2026-04-01",
        retiredKm: 6450.4,
      }),
    ).toEqual({ days: 365, km: 5250 });
  });
});
