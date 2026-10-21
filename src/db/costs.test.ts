import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { costPerYear, summarizeCosts } from "@/lib/costs";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { recordPartEvent } from "./part-events";
import { getCostEntries } from "./queries";
import { bikes, parts } from "./schema";
import { createServiceRound } from "./service-rounds";

let bikeId: number;
const part = (id: number) => db.select().from(parts).where(eq(parts.id, id)).get()!;
const addPart = (kind: string, category: "drivetrain" | "wheels", cost: number | null) =>
  db
    .insert(parts)
    .values({ bikeId, kind, name: kind, category, installedAt: "2024-03-01", installedKm: 0, cost })
    .returning()
    .get().id;

beforeAll(() => {
  runMigrations();
  bikeId = db
    .insert(bikes)
    .values({ name: "Costs", odometerKm: 6000, purchasedAt: "2024-01-15", purchasePrice: 2000 })
    .returning()
    .get().id;
  const chain = addPart("Chain", "drivetrain", 40);
  const tire = addPart("Tire", "wheels", null);
  // A bike that isn't this one: its costs must not show up.
  const other = db.insert(bikes).values({ name: "Other" }).returning().get().id;
  db.insert(parts)
    .values({
      bikeId: other,
      kind: "x",
      name: "x",
      category: "wheels",
      installedAt: "2025-01-01",
      cost: 999,
    })
    .run();

  db.transaction((tx) => {
    recordPartEvent(tx, part(chain), {
      type: "cleaned",
      date: "2025-02-01",
      odometerKm: 3000,
      cost: 12.5,
      resetsInterval: false,
    });
    // The price of a replacement goes on the new part, dated when it was fitted.
    recordPartEvent(tx, part(tire), {
      type: "replaced",
      date: "2025-06-01",
      odometerKm: 4000,
      cost: 55,
      resetsInterval: true,
      replacement: { cost: 55 },
    });
  });
  // The round's total covers its parts; their events carry no cost of their own.
  createServiceRound({
    bikeId,
    date: "2026-04-10",
    shop: "Fietsmaker",
    odometerKm: 5500,
    totalCost: 120,
    parts: [{ partId: chain, type: "serviced" }],
  });
});

describe("bike costs", () => {
  it("adds up the purchase, part prices, maintenance steps and service rounds exactly once", () => {
    const bike = db.select().from(bikes).where(eq(bikes.id, bikeId)).get()!;
    const entries = getCostEntries(bike);
    expect(entries.map((e) => [e.date, e.amount, e.source])).toEqual([
      ["2026-04-10", 120, "round"],
      ["2025-06-01", 55, "part"],
      ["2025-02-01", 12.5, "event"],
      ["2024-03-01", 40, "part"],
      ["2024-01-15", 2000, "purchase"],
    ]);

    // The purchase counts in the total, but not in the maintenance breakdowns.
    const summary = summarizeCosts(entries, 2026);
    expect(summary.purchase).toBe(2000);
    expect(summary.maintenance).toBe(40 + 12.5 + 55 + 120);
    expect(summary.total).toBe(2000 + 40 + 12.5 + 55 + 120);
    expect(summary.byYear).toEqual([
      { year: 2024, amount: 40 },
      { year: 2025, amount: 67.5 },
      { year: 2026, amount: 120 },
    ]);
    expect(summary.byCategory).toEqual([
      { category: "service", amount: 120 },
      { category: "wheels", amount: 55 },
      { category: "drivetrain", amount: 52.5 },
    ]);
  });

  it("fills years without costs up to this year", () => {
    const summary = summarizeCosts(
      [
        {
          date: "2023-05-01",
          amount: 10,
          category: "brakes",
          label: "",
          source: "part",
          partId: 1,
        },
      ],
      2025,
    );
    expect(summary.byYear.map((y) => y.amount)).toEqual([10, 0, 0]);
    expect(summarizeCosts([], 2025)).toEqual({
      total: 0,
      purchase: 0,
      maintenance: 0,
      byYear: [],
      byCategory: [],
    });
  });
});

describe("costPerYear", () => {
  const now = new Date(2026, 9, 21);

  it("spreads the total over the years owned", () => {
    expect(costPerYear(3000, "2024-10-21", now)).toBeCloseTo(1500, 0);
    expect(costPerYear(2000, "2025-04-21", now)).toBeCloseTo(2000 / (548 / 365));
  });

  it("counts a bike owned less than a year as one year", () => {
    expect(costPerYear(1200, "2026-08-21", now)).toBe(1200);
  });
});
