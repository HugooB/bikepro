import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./index";
import { bikes, partEvents, parts, serviceRounds } from "./schema";

// Bike lookups take the signed-in user's id, so nobody sees another user's bikes. Queries
// below that take a bike id are only called with a bike that came from one of these.

/** The user's bikes for the switcher and settings; archived bikes only when asked for. */
export function getBikes(userId: number, { includeArchived = false } = {}) {
  return db.query.bikes.findMany({
    where: and(eq(bikes.userId, userId), includeArchived ? undefined : isNull(bikes.archivedAt)),
    orderBy: [asc(bikes.createdAt), asc(bikes.id)],
  });
}

/** One of the user's bikes; undefined if it doesn't exist or belongs to someone else. */
export function getBike(userId: number, id: number) {
  if (!Number.isInteger(id)) return Promise.resolve(undefined);
  return db.query.bikes.findFirst({ where: and(eq(bikes.id, id), eq(bikes.userId, userId)) });
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
