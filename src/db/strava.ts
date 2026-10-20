import { and, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";
import type { StravaTokens } from "@/lib/strava/api";
import { decryptToken, encryptToken } from "@/lib/strava/crypto";
import { db } from "./index";
import { bikes, stravaConnections, type Bike, type StravaGear } from "./schema";

// The Strava connection of each user and the link between their bikes and Strava bikes.
// While a bike is linked: odometerKm = its Strava bike's total distance + stravaOffsetKm.

export function getStravaConnection(userId: number) {
  return db.select().from(stravaConnections).where(eq(stravaConnections.userId, userId)).get();
}

/** Thrown when the Strava account is already connected to another BikePro account. */
export class StravaAccountTakenError extends Error {}

/** Saves (or replaces) the user's connection after they approved BikePro on Strava. */
export function saveStravaConnection(
  userId: number,
  c: { athleteId: number; athleteName: string; scope: string; tokens: StravaTokens },
) {
  db.transaction((tx) => {
    const taken = tx
      .select({ userId: stravaConnections.userId })
      .from(stravaConnections)
      .where(
        and(eq(stravaConnections.athleteId, c.athleteId), ne(stravaConnections.userId, userId)),
      )
      .get();
    if (taken) throw new StravaAccountTakenError();

    const previous = tx
      .select({ athleteId: stravaConnections.athleteId })
      .from(stravaConnections)
      .where(eq(stravaConnections.userId, userId))
      .get();
    // Links to another Strava account's bikes mean nothing for the new one.
    if (previous && previous.athleteId !== c.athleteId) unlinkAllBikes(tx, userId);

    const values = {
      athleteId: c.athleteId,
      athleteName: c.athleteName,
      scope: c.scope,
      ...encryptedTokens(c.tokens),
      syncError: null,
    };
    tx.insert(stravaConnections)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: stravaConnections.userId, set: values })
      .run();
  });
}

const encryptedTokens = (t: StravaTokens) => ({
  accessToken: encryptToken(t.accessToken),
  refreshToken: encryptToken(t.refreshToken),
  expiresAt: t.expiresAt,
});

export function readTokens(c: { accessToken: string; refreshToken: string; expiresAt: Date }) {
  return {
    accessToken: decryptToken(c.accessToken),
    refreshToken: decryptToken(c.refreshToken),
    expiresAt: c.expiresAt,
  };
}

export function updateStravaTokens(userId: number, tokens: StravaTokens) {
  db.update(stravaConnections)
    .set(encryptedTokens(tokens))
    .where(eq(stravaConnections.userId, userId))
    .run();
}

/** Removes the connection; bikes keep their odometer but are no longer linked. */
export function deleteStravaConnection(userId: number) {
  db.transaction((tx) => {
    unlinkAllBikes(tx, userId);
    tx.delete(stravaConnections).where(eq(stravaConnections.userId, userId)).run();
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function unlinkAllBikes(tx: Tx, userId: number) {
  tx.update(bikes)
    .set({ stravaGearId: null, stravaDistanceKm: null, stravaOffsetKm: 0 })
    .where(and(eq(bikes.userId, userId), isNotNull(bikes.stravaGearId)))
    .run();
}

/**
 * Claims a sync for the user unless one was attempted less than `minIntervalMs` ago, so
 * several tabs or quick reloads don't each call Strava. Returns whether to go ahead.
 */
export function claimStravaSync(userId: number, minIntervalMs: number, now = new Date()) {
  const cutoff = new Date(now.getTime() - minIntervalMs);
  const claimed = db
    .update(stravaConnections)
    .set({ syncAttemptAt: now })
    .where(
      and(
        eq(stravaConnections.userId, userId),
        or(isNull(stravaConnections.syncAttemptAt), lt(stravaConnections.syncAttemptAt, cutoff)),
      ),
    )
    .returning({ userId: stravaConnections.userId })
    .all();
  return claimed.length > 0;
}

export function markStravaSyncFailed(userId: number, error: "revoked" | "failed") {
  db.update(stravaConnections)
    .set({ syncError: error })
    .where(eq(stravaConnections.userId, userId))
    .run();
}

/**
 * Stores the Strava bikes from a sync and moves each linked bike's odometer to its Strava
 * total plus offset. A linked bike missing from Strava is left alone. Returns whether any
 * odometer changed.
 */
export function applyStravaGear(userId: number, gear: StravaGear[], now = new Date()): boolean {
  return db.transaction((tx) => {
    tx.update(stravaConnections)
      .set({ gear, syncedAt: now, syncError: null })
      .where(eq(stravaConnections.userId, userId))
      .run();

    const byId = new Map(gear.map((g) => [g.id, g]));
    const linked = tx
      .select()
      .from(bikes)
      .where(and(eq(bikes.userId, userId), isNotNull(bikes.stravaGearId)))
      .all();
    let changed = false;
    for (const bike of linked) {
      const g = byId.get(bike.stravaGearId!);
      if (!g || g.distanceKm === bike.stravaDistanceKm) continue;
      tx.update(bikes)
        .set({
          stravaDistanceKm: g.distanceKm,
          odometerKm: Math.max(0, g.distanceKm + bike.stravaOffsetKm),
        })
        .where(eq(bikes.id, bike.id))
        .run();
      changed = true;
    }
    return changed;
  });
}

/** A user-facing reason a bike can't be linked. */
export class StravaLinkError extends Error {}

/**
 * Finds a Strava bike from the last sync that `bikeId` may link to: it exists and isn't
 * already linked to another of the user's bikes.
 */
export function findLinkableGear(userId: number, gearId: string, bikeId?: number) {
  const connection = getStravaConnection(userId);
  const gear = connection?.gear.find((g) => g.id === gearId);
  if (!gear) throw new StravaLinkError("That bike isn't in your Strava account");
  const other = db
    .select({ id: bikes.id, name: bikes.name, userId: bikes.userId })
    .from(bikes)
    .where(eq(bikes.stravaGearId, gearId))
    .get();
  if (other && other.id !== bikeId) {
    // Only name the bike when it's the user's own; never reveal someone else's.
    throw new StravaLinkError(
      other.userId === userId
        ? `That Strava bike is already linked to ${other.name}`
        : "That Strava bike is already linked",
    );
  }
  return gear;
}

/**
 * Links a bike to a Strava bike. `keepOdometer` keeps the current reading and counts only
 * new Strava km from now on; otherwise the odometer becomes Strava's total.
 */
export function linkBikeToStrava(bike: Bike, gearId: string, keepOdometer: boolean) {
  const gear = findLinkableGear(bike.userId!, gearId, bike.id);
  db.update(bikes)
    .set({
      stravaGearId: gear.id,
      stravaDistanceKm: gear.distanceKm,
      stravaOffsetKm: keepOdometer ? bike.odometerKm - gear.distanceKm : 0,
      odometerKm: keepOdometer ? bike.odometerKm : gear.distanceKm,
    })
    .where(eq(bikes.id, bike.id))
    .run();
}

export function unlinkBikeFromStrava(bikeId: number) {
  db.update(bikes)
    .set({ stravaGearId: null, stravaDistanceKm: null, stravaOffsetKm: 0 })
    .where(eq(bikes.id, bikeId))
    .run();
}
