import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { bikes, partEvents, parts, serviceRounds } from "./schema";

// Ownership checks for server actions: each returns the record only when it belongs to one
// of the user's bikes, and undefined otherwise, whether it doesn't exist or isn't theirs.

export function getOwnedBike(userId: number, bikeId: number) {
  return db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, bikeId), eq(bikes.userId, userId)))
    .get();
}

export function getOwnedPart(userId: number, partId: number) {
  return db
    .select({ part: parts })
    .from(parts)
    .innerJoin(bikes, eq(bikes.id, parts.bikeId))
    .where(and(eq(parts.id, partId), eq(bikes.userId, userId)))
    .get()?.part;
}

export function getOwnedEvent(userId: number, eventId: number) {
  return db
    .select({ event: partEvents, part: parts })
    .from(partEvents)
    .innerJoin(parts, eq(parts.id, partEvents.partId))
    .innerJoin(bikes, eq(bikes.id, parts.bikeId))
    .where(and(eq(partEvents.id, eventId), eq(bikes.userId, userId)))
    .get();
}

export function getOwnedServiceRound(userId: number, roundId: number) {
  return db
    .select({ round: serviceRounds })
    .from(serviceRounds)
    .innerJoin(bikes, eq(bikes.id, serviceRounds.bikeId))
    .where(and(eq(serviceRounds.id, roundId), eq(bikes.userId, userId)))
    .get()?.round;
}
