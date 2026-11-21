import { and, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";
import type { StravaTokens } from "@/lib/strava/api";
import { UserError } from "@/lib/user-error";
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
    // Links to another Strava account's bikes mean nothing for the new one, and neither do
    // the bikes cached from its last sync: drop them so the next sync starts fresh.
    const switched = !!previous && previous.athleteId !== c.athleteId;
    if (switched) unlinkAllBikes(tx, userId);

    const values = {
      athleteId: c.athleteId,
      athleteName: c.athleteName,
      scope: c.scope,
      ...encryptedTokens(c.tokens),
      syncError: null,
      ...(switched && { gear: [], syncedAt: null, syncAttemptAt: null }),
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

/**
 * Stores refreshed tokens, but only while the connection is still to `athleteId`: a refresh
 * that finishes after the user connected another Strava account must not overwrite it.
 */
export function updateStravaTokens(userId: number, athleteId: number, tokens: StravaTokens) {
  db.update(stravaConnections)
    .set(encryptedTokens(tokens))
    .where(and(eq(stravaConnections.userId, userId), eq(stravaConnections.athleteId, athleteId)))
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
 * odometer changed. With `athleteId`, nothing happens unless the connection is still to that
 * Strava account (the user may have connected another one while the sync ran).
 */
export function applyStravaGear(
  userId: number,
  gear: StravaGear[],
  { athleteId, now = new Date() }: { athleteId?: number; now?: Date } = {},
): boolean {
  return db.transaction((tx) => {
    const updated = tx
      .update(stravaConnections)
      .set({ gear, syncedAt: now, syncError: null })
      .where(
        and(
          eq(stravaConnections.userId, userId),
          athleteId === undefined ? undefined : eq(stravaConnections.athleteId, athleteId),
        ),
      )
      .returning({ userId: stravaConnections.userId })
      .all();
    if (updated.length === 0) return false;

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
export class StravaLinkError extends UserError {}

/**
 * Finds a Strava bike from the last sync that `bikeId` may link to: it exists and isn't
 * already linked to another of the user's bikes.
 */
export function findLinkableGear(userId: number, gearId: string, bikeId?: number) {
  const connection = getStravaConnection(userId);
  const gear = connection?.gear.find((g) => g.id === gearId);
  if (!gear) throw new StravaLinkError("errors.stravaBikeMissing");
  const other = db
    .select({ id: bikes.id, name: bikes.name, userId: bikes.userId })
    .from(bikes)
    .where(eq(bikes.stravaGearId, gearId))
    .get();
  if (other && other.id !== bikeId) {
    // Only name the bike when it's the user's own; never reveal someone else's.
    throw other.userId === userId
      ? new StravaLinkError("errors.stravaBikeLinkedTo", { bike: other.name })
      : new StravaLinkError("errors.stravaBikeLinked");
  }
  return gear;
}

/**
 * Links a bike to a Strava bike. `keepOdometer` keeps the current reading and counts only
 * new Strava km from now on; otherwise the odometer becomes Strava's total.
 */
export function linkBikeToStrava(bike: Bike, gearId: string, keepOdometer: boolean) {
  const gear = findLinkableGear(bike.userId, gearId, bike.id);
  db.update(bikes)
    .set({
      stravaGearId: gear.id,
      stravaDistanceKm: gear.distanceKm,
      stravaOffsetKm: keepOdometer ? bike.odometerKm - gear.distanceKm : 0,
      odometerKm: keepOdometer ? bike.odometerKm : gear.distanceKm,
    })
    .where(and(eq(bikes.id, bike.id), eq(bikes.userId, bike.userId)))
    .run();
}

export function unlinkBikeFromStrava(bike: Pick<Bike, "id" | "userId">) {
  db.update(bikes)
    .set({ stravaGearId: null, stravaDistanceKm: null, stravaOffsetKm: 0 })
    .where(and(eq(bikes.id, bike.id), eq(bikes.userId, bike.userId)))
    .run();
}
