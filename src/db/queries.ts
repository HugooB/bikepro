import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./index";
import { bikes, partEvents, parts, serviceRounds } from "./schema";

export function getFirstBike() {
  return db.query.bikes.findFirst({
    where: isNull(bikes.archivedAt),
    orderBy: asc(bikes.createdAt),
  });
}

export function getBike(id: number) {
  return db.query.bikes.findFirst({ where: eq(bikes.id, id) });
}

export function getActiveParts(bikeId: number) {
  return db.query.parts.findMany({
    where: and(eq(parts.bikeId, bikeId), eq(parts.status, "active")),
    orderBy: [asc(parts.sortOrder), asc(parts.id)],
  });
}

export function getPart(bikeId: number, partId: number) {
  return db.query.parts.findFirst({
    where: and(eq(parts.id, partId), eq(parts.bikeId, bikeId)),
  });
}

export function getPartEvents(partId: number) {
  return db.query.partEvents.findMany({
    where: eq(partEvents.partId, partId),
    orderBy: [desc(partEvents.date), desc(partEvents.id)],
    with: { serviceRound: { columns: { id: true, shop: true } } },
  });
}

export type PartEventWithRound = Awaited<ReturnType<typeof getPartEvents>>[number];

export function getLastServiceRound(bikeId: number) {
  return db.query.serviceRounds.findFirst({
    where: eq(serviceRounds.bikeId, bikeId),
    orderBy: [desc(serviceRounds.date), desc(serviceRounds.id)],
  });
}

/** Shop names used before on this bike, most recent first, for autocomplete. */
export function getKnownShops(bikeId: number): string[] {
  const rows = db
    .selectDistinct({ shop: serviceRounds.shop })
    .from(serviceRounds)
    .where(and(eq(serviceRounds.bikeId, bikeId), isNotNull(serviceRounds.shop)))
    .orderBy(desc(serviceRounds.date))
    .all();
  return rows.map((r) => r.shop!);
}

export type ResetPoint = { date: string; odometerKm: number | null };

/** Latest interval-resetting event per part of a bike, keyed by part id. */
export function getLastResets(bikeId: number): Map<number, ResetPoint> {
  const rows = db
    .select({ partId: partEvents.partId, date: partEvents.date, odometerKm: partEvents.odometerKm })
    .from(partEvents)
    .innerJoin(parts, eq(parts.id, partEvents.partId))
    .where(and(eq(parts.bikeId, bikeId), eq(partEvents.resetsInterval, true)))
    .orderBy(desc(partEvents.date), desc(partEvents.id))
    .all();

  const latest = new Map<number, ResetPoint>();
  for (const row of rows) {
    if (!latest.has(row.partId)) latest.set(row.partId, row);
  }
  return latest;
}

/** Parts that were replaced, most recently retired first. */
export function getRetiredParts(bikeId: number) {
  return db.query.parts.findMany({
    where: and(eq(parts.bikeId, bikeId), eq(parts.status, "retired")),
    orderBy: [desc(parts.retiredAt), desc(parts.id)],
  });
}

/** Service rounds with the parts they covered, newest first. */
export function getServiceRounds(bikeId: number) {
  return db.query.serviceRounds.findMany({
    where: eq(serviceRounds.bikeId, bikeId),
    orderBy: [desc(serviceRounds.date), desc(serviceRounds.id)],
    with: {
      events: {
        columns: { id: true, type: true, description: true },
        with: { part: { columns: { id: true, name: true, sortOrder: true } } },
      },
    },
  });
}

export type ServiceRoundWithParts = Awaited<ReturnType<typeof getServiceRounds>>[number];
