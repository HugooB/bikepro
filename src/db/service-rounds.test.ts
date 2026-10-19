import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { bikes, partEvents, parts, serviceRounds } from "./schema";
import { createServiceRound } from "./service-rounds";

let bikeId: number;
let otherBikePartId: number;
const partIds: Record<string, number> = {};

beforeAll(() => {
  runMigrations();
  bikeId = db.insert(bikes).values({ name: "Test bike", odometerKm: 5000 }).returning().get().id;
  for (const kind of ["chain", "cassette", "bar_tape", "saddle"]) {
    partIds[kind] = db
      .insert(parts)
      .values({
        bikeId,
        kind,
        name: kind,
        category: "drivetrain",
        installedAt: "2025-01-01",
        installedKm: 0,
      })
      .returning()
      .get().id;
  }
  const other = db.insert(bikes).values({ name: "Other bike" }).returning().get();
  otherBikePartId = db
    .insert(parts)
    .values({
      bikeId: other.id,
      kind: "chain",
      name: "chain",
      category: "drivetrain",
      installedAt: "2025-01-01",
    })
    .returning()
    .get().id;
});

const eventsFor = (partId: number) =>
  db.select().from(partEvents).where(eq(partEvents.partId, partId)).all();

describe("createServiceRound", () => {
  it("logs one linked event per covered part with the round's date and km", () => {
    const round = createServiceRound({
      bikeId,
      date: "2026-10-10",
      shop: "Wielerwerkplaats",
      odometerKm: 5400,
      totalCost: 129.5,
      notes: "Yearly service",
      parts: [
        { partId: partIds.chain, type: "replaced", note: "Ultegra chain" },
        { partId: partIds.cassette, type: "cleaned" },
        { partId: partIds.bar_tape, type: "serviced" },
      ],
    });

    expect(
      db.select().from(serviceRounds).where(eq(serviceRounds.id, round.id)).get(),
    ).toMatchObject({
      shop: "Wielerwerkplaats",
      totalCost: 129.5,
    });

    const [chain] = eventsFor(partIds.chain);
    expect(chain).toMatchObject({
      type: "replaced",
      description: "Ultegra chain",
      date: "2026-10-10",
      odometerKm: 5400,
      resetsInterval: true,
      serviceRoundId: round.id,
      cost: null, // the round carries the cost, so it isn't counted twice
    });
    expect(eventsFor(partIds.cassette)[0]).toMatchObject({
      type: "cleaned",
      resetsInterval: false,
    });
    expect(eventsFor(partIds.bar_tape)[0]).toMatchObject({
      type: "serviced",
      resetsInterval: true,
    });
    expect(eventsFor(partIds.saddle)).toHaveLength(0);
  });

  it("makes replaced parts new again and moves the odometer forward", () => {
    const chain = db.select().from(parts).where(eq(parts.id, partIds.chain)).get();
    expect(chain).toMatchObject({ installedAt: "2026-10-10", installedKm: 5400 });
    expect(db.select().from(bikes).where(eq(bikes.id, bikeId)).get()?.odometerKm).toBe(5400);
  });

  it("never moves the odometer backwards", () => {
    createServiceRound({ bikeId, date: "2026-10-11", odometerKm: 100, parts: [] });
    expect(db.select().from(bikes).where(eq(bikes.id, bikeId)).get()?.odometerKm).toBe(5400);
  });

  it("rejects parts from another bike and saves nothing", () => {
    const before = db.select().from(serviceRounds).all().length;
    expect(() =>
      createServiceRound({
        bikeId,
        date: "2026-10-12",
        odometerKm: 5500,
        parts: [
          { partId: partIds.saddle, type: "serviced" },
          { partId: otherBikePartId, type: "serviced" },
        ],
      }),
    ).toThrow();
    expect(db.select().from(serviceRounds).all()).toHaveLength(before);
    expect(eventsFor(partIds.saddle)).toHaveLength(0);
  });

  it("removes its part events when the round is deleted", () => {
    const round = createServiceRound({
      bikeId,
      date: "2026-10-13",
      odometerKm: 5500,
      parts: [{ partId: partIds.saddle, type: "adjusted" }],
    });
    db.delete(serviceRounds).where(eq(serviceRounds.id, round.id)).run();
    expect(eventsFor(partIds.saddle)).toHaveLength(0);
  });
});
