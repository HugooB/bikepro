import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { PartEventError, recordPartEvent } from "./part-events";
import { bikes, partEvents, parts, type Part } from "./schema";

let bikeId: number;

beforeAll(() => {
  runMigrations();
  bikeId = db.insert(bikes).values({ name: "Test bike", odometerKm: 6000 }).returning().get().id;
});

function makeTire(): Part {
  return db
    .insert(parts)
    .values({
      bikeId,
      kind: "tire_rear",
      name: "Rear tire",
      category: "wheels",
      svgZone: "tire_rear",
      brand: "Old brand",
      installedAt: "2025-05-01",
      installedKm: 1000,
      intervalKm: 3500,
      intervalDays: 730,
      cost: 40,
      sortOrder: 9,
    })
    .returning()
    .get();
}

const getPart = (id: number) => db.select().from(parts).where(eq(parts.id, id)).get()!;
const eventsFor = (id: number) =>
  db.select().from(partEvents).where(eq(partEvents.partId, id)).all();

describe("recordPartEvent: replaced", () => {
  it("retires the part and installs a new one with the same interval", () => {
    const tire = makeTire();
    const fresh = db.transaction((tx) =>
      recordPartEvent(tx, tire, {
        type: "replaced",
        description: "Puncture beyond repair",
        date: "2026-10-01",
        odometerKm: 5800,
        resetsInterval: true,
        replacement: { brand: "Continental", model: "GP5000", cost: 65 },
      }),
    )!;

    expect(getPart(tire.id)).toMatchObject({
      status: "retired",
      retiredAt: "2026-10-01",
      retiredKm: 5800,
      replacedByPartId: fresh.id,
      cost: 40, // the old part keeps its own price
    });
    expect(fresh).toMatchObject({
      status: "active",
      kind: "tire_rear",
      name: "Rear tire",
      category: "wheels",
      svgZone: "tire_rear",
      sortOrder: 9,
      intervalKm: 3500,
      intervalDays: 730,
      brand: "Continental",
      model: "GP5000",
      cost: 65,
      installedAt: "2026-10-01",
      installedKm: 5800,
    });
    expect(eventsFor(tire.id)).toMatchObject([
      { type: "replaced", description: "Puncture beyond repair", odometerKm: 5800 },
    ]);
    expect(eventsFor(fresh.id)).toMatchObject([
      {
        type: "installed",
        description: "Replaces the previous rear tire",
        date: "2026-10-01",
        resetsInterval: true,
      },
    ]);
  });

  it("rejects a replacement dated before the part was installed", () => {
    const tire = makeTire();
    expect(() =>
      db.transaction((tx) =>
        recordPartEvent(tx, tire, {
          type: "replaced",
          date: "2025-01-01",
          odometerKm: 500,
          resetsInterval: true,
        }),
      ),
    ).toThrow(PartEventError);
    expect(getPart(tire.id).status).toBe("active");
  });

  it("doesn't log anything on a part that was already replaced", () => {
    const tire = makeTire();
    db.transaction((tx) =>
      recordPartEvent(tx, tire, {
        type: "replaced",
        date: "2026-10-02",
        odometerKm: 5900,
        resetsInterval: true,
      }),
    );
    const retired = getPart(tire.id);
    expect(() =>
      db.transaction((tx) =>
        recordPartEvent(tx, retired, {
          type: "cleaned",
          date: "2026-10-03",
          odometerKm: 5900,
          resetsInterval: false,
        }),
      ),
    ).toThrow(PartEventError);
  });
});

describe("recordPartEvent: other types", () => {
  it("adds an event without touching the part", () => {
    const tire = makeTire();
    const result = db.transaction((tx) =>
      recordPartEvent(tx, tire, {
        type: "serviced",
        date: "2026-09-01",
        odometerKm: 5000,
        cost: 12,
        resetsInterval: true,
      }),
    );
    expect(result).toBeUndefined();
    expect(getPart(tire.id)).toMatchObject({ status: "active", installedAt: "2025-05-01" });
    expect(eventsFor(tire.id)).toMatchObject([
      { type: "serviced", cost: 12, resetsInterval: true },
    ]);
  });
});
