import type { BikePlan } from "@/lib/wizard-schema";
import type { Tx } from "./part-events";
import { bikes, partEvents, parts, type Bike } from "./schema";

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
        intervalKm: p.intervalKm ?? null,
        intervalDays: p.intervalDays ?? null,
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
