import { eq } from "drizzle-orm";
import type { PartEventType } from "./schema";
import { bikes, partEvents, parts, type Part } from "./schema";
import type { db } from "./index";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NewPartEvent = {
  type: Exclude<PartEventType, "installed">;
  description?: string | null;
  date: string;
  odometerKm: number;
  cost?: number | null;
  resetsInterval: boolean;
  serviceRoundId?: number | null;
};

/**
 * Records a maintenance event on a part. A replacement always restarts the interval and,
 * when it is the newest one, makes the part "new" again so its age counts from that date.
 */
export function recordPartEvent(tx: Tx, part: Part, event: NewPartEvent) {
  const resetsInterval = event.type === "replaced" || event.resetsInterval;

  tx.insert(partEvents)
    .values({
      partId: part.id,
      type: event.type,
      description: event.description ?? null,
      date: event.date,
      odometerKm: event.odometerKm,
      cost: event.cost ?? null,
      resetsInterval,
      serviceRoundId: event.serviceRoundId ?? null,
    })
    .run();

  if (event.type === "replaced" && event.date >= part.installedAt) {
    tx.update(parts)
      .set({ installedAt: event.date, installedKm: event.odometerKm })
      .where(eq(parts.id, part.id))
      .run();
  }
}

/** Moves the bike's odometer forward when a higher reading is logged; never backwards. */
export function bumpOdometer(tx: Tx, bikeId: number, odometerKm: number) {
  const bike = tx.select().from(bikes).where(eq(bikes.id, bikeId)).get();
  if (bike && odometerKm > bike.odometerKm) {
    tx.update(bikes).set({ odometerKm }).where(eq(bikes.id, bikeId)).run();
  }
}
