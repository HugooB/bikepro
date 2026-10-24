import { asc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { bikes, partEvents, parts, serviceRounds, stravaConnections, users } from "./schema";

/** Bump when the shape below changes, so an old backup can still be recognized. */
export const EXPORT_VERSION = 1;

/**
 * Everything a user has in BikePro, as plain JSON for a backup. Secrets stay out: no password
 * hash, no Strava tokens. Each bike carries its parts (with their events) and service rounds.
 * Distances are always in km and amounts in `currency`, whatever the user's display settings.
 */
export function buildExport(userId: number, now = new Date()) {
  const user = db
    .select({
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      currency: users.currency,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (!user) throw new Error(`User ${userId} not found`);

  const strava = db
    .select({
      athleteId: stravaConnections.athleteId,
      athleteName: stravaConnections.athleteName,
      syncedAt: stravaConnections.syncedAt,
    })
    .from(stravaConnections)
    .where(eq(stravaConnections.userId, userId))
    .get();

  const bikeRows = db
    .select()
    .from(bikes)
    .where(eq(bikes.userId, userId))
    .orderBy(asc(bikes.id))
    .all();
  const bikeIds = bikeRows.map((b) => b.id);
  const partRows = bikeIds.length
    ? db.select().from(parts).where(inArray(parts.bikeId, bikeIds)).orderBy(asc(parts.id)).all()
    : [];
  const partIds = partRows.map((p) => p.id);
  const eventRows = partIds.length
    ? db
        .select()
        .from(partEvents)
        .where(inArray(partEvents.partId, partIds))
        .orderBy(asc(partEvents.date), asc(partEvents.id))
        .all()
    : [];
  const roundRows = bikeIds.length
    ? db
        .select()
        .from(serviceRounds)
        .where(inArray(serviceRounds.bikeId, bikeIds))
        .orderBy(asc(serviceRounds.date), asc(serviceRounds.id))
        .all()
    : [];

  return {
    app: "BikePro",
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    distanceUnit: "km",
    currency: user.currency,
    user: { name: user.name, email: user.email, createdAt: user.createdAt },
    strava: strava ?? null,
    bikes: bikeRows.map((bike) => ({
      ...bike,
      parts: partRows
        .filter((p) => p.bikeId === bike.id)
        .map((part) => ({ ...part, events: eventRows.filter((e) => e.partId === part.id) })),
      serviceRounds: roundRows.filter((r) => r.bikeId === bike.id),
    })),
  };
}
