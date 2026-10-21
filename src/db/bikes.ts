import { eq } from "drizzle-orm";
import type { BikePlan } from "@/lib/wizard-schema";
import type { Tx } from "./part-events";
import { bikes, partEvents, parts, type Bike } from "./schema";

/**
 * Sets a bike's odometer by hand. On a bike linked to Strava the offset moves with it, so
 * later syncs add new Strava km on top of this reading instead of overwriting it.
 */
export function setOdometer(tx: Tx, bike: Bike, odometerKm: number) {
  const linked = bike.stravaGearId && bike.stravaDistanceKm !== null;
  tx.update(bikes)
    .set({
      odometerKm,
      ...(linked && { stravaOffsetKm: odometerKm - bike.stravaDistanceKm! }),
    })
    .where(eq(bikes.id, bike.id))
    .run();
}

/** Creates a bike for `userId` with its parts, each starting with an "installed" event. */
export function createBike(tx: Tx, plan: BikePlan, userId: number): Bike {
  const bike = tx
    .insert(bikes)
    .values({ ...plan.bike, userId })
    .returning()
    .get();

  for (const p of plan.parts) {
    const part = tx
      .insert(parts)
      .values({
        bikeId: bike.id,
        category: p.category,
        kind: p.kind,
        name: p.name,
        svgZone: p.svgZone,
        installedAt: p.installedAt,
        installedKm: p.installedKm,
        serviceIntervalKm: p.serviceIntervalKm ?? null,
        serviceIntervalDays: p.serviceIntervalDays ?? null,
        replaceIntervalKm: p.replaceIntervalKm ?? null,
        replaceIntervalDays: p.replaceIntervalDays ?? null,
        sortOrder: p.sortOrder,
      })
      .returning()
      .get();

    tx.insert(partEvents)
      .values({
        partId: part.id,
        type: "installed",
        date: p.installedAt,
        odometerKm: p.installedKm,
        resetsInterval: true,
        description: p.replaced
          ? `New ${p.name.toLowerCase()} fitted after buying the bike`
          : "Came with the bike",
      })
      .run();
  }

  return bike;
}
