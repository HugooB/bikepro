import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/strava/crypto";
import { emptyDraft, planBike } from "@/lib/wizard-schema";
import { setAppSetting } from "./app-settings";
import { createBike, setOdometer } from "./bikes";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { bumpOdometer } from "./part-events";
import { bikes, stravaConnections, type StravaGear } from "./schema";
import {
  applyStravaGear,
  claimStravaSync,
  deleteStravaConnection,
  getStravaConnection,
  linkBikeToStrava,
  readTokens,
  saveStravaConnection,
  StravaAccountTakenError,
  StravaLinkError,
} from "./strava";
import { createUser } from "./users";

const TODAY = "2026-10-20";
const tokens = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: new Date("2026-10-20T18:00:00Z"),
};
const gear = (id: string, distanceKm: number): StravaGear => ({
  id,
  name: `Bike ${id}`,
  distanceKm,
  primary: false,
  retired: false,
});

let userId: number;
const bike = (id: number) => db.select().from(bikes).where(eq(bikes.id, id)).get()!;
const newBike = (name: string, odometerKm: number) =>
  db.transaction((tx) =>
    createBike(
      tx,
      planBike({ ...emptyDraft(TODAY), name, odometerKm: String(odometerKm) }, TODAY),
      userId,
    ),
  );

beforeAll(() => {
  process.env.STRAVA_CLIENT_SECRET = "test-secret";
  runMigrations();
  userId = createUser({ email: "rider@example.com", name: "Rider", passwordHash: "x" }).id;
});

beforeEach(() => {
  db.delete(stravaConnections).run();
  db.delete(bikes).run();
  saveStravaConnection(userId, { athleteId: 42, athleteName: "Rider", scope: "read", tokens });
  applyStravaGear(userId, [gear("b1", 1000), gear("b2", 5000)]);
});

describe("token encryption", () => {
  it("stores tokens encrypted and reads them back", () => {
    const stored = getStravaConnection(userId)!;
    expect(stored.accessToken).not.toContain("access-1");
    expect(readTokens(stored)).toEqual(tokens);
  });

  it("refuses a token encrypted with another secret", () => {
    const stored = encryptToken("secret-token", "one");
    expect(decryptToken(stored, "one")).toBe("secret-token");
    expect(() => decryptToken(stored, "two")).toThrow();
  });
});

describe("connecting", () => {
  it("won't connect one Strava account to two BikePro accounts", () => {
    setAppSetting("registrationOpen", true);
    const other = createUser({ email: "other@example.com", name: "Other", passwordHash: "x" });
    setAppSetting("registrationOpen", false);
    expect(() =>
      saveStravaConnection(other.id, { athleteId: 42, athleteName: "X", scope: "read", tokens }),
    ).toThrow(StravaAccountTakenError);
  });

  it("unlinks bikes when the user connects a different Strava account", () => {
    const b = newBike("Road", 1000);
    linkBikeToStrava(b, "b1", false);
    saveStravaConnection(userId, { athleteId: 7, athleteName: "New", scope: "read", tokens });
    expect(bike(b.id).stravaGearId).toBeNull();
  });
});

describe("linking", () => {
  it("can take Strava's total as the odometer", () => {
    const b = newBike("Road", 800);
    linkBikeToStrava(b, "b1", false);
    expect(bike(b.id)).toMatchObject({ stravaGearId: "b1", odometerKm: 1000, stravaOffsetKm: 0 });
  });

  it("can keep the current reading and only add new Strava km", () => {
    const b = newBike("Road", 800);
    linkBikeToStrava(b, "b1", true);
    expect(bike(b.id)).toMatchObject({ odometerKm: 800, stravaOffsetKm: -200 });

    applyStravaGear(userId, [gear("b1", 1050)]);
    expect(bike(b.id).odometerKm).toBe(850);
  });

  it("links a Strava bike to one BikePro bike only", () => {
    const a = newBike("A", 0);
    const b = newBike("B", 0);
    linkBikeToStrava(a, "b1", false);
    expect(() => linkBikeToStrava(b, "b1", false)).toThrow(StravaLinkError);
    expect(() => linkBikeToStrava(b, "nope", false)).toThrow(StravaLinkError);
  });
});

describe("syncing", () => {
  it("moves linked odometers and reports whether anything changed", () => {
    const b = newBike("Road", 0);
    linkBikeToStrava(b, "b2", false);
    expect(applyStravaGear(userId, [gear("b2", 5000)])).toBe(false);
    expect(applyStravaGear(userId, [gear("b2", 5120.5)])).toBe(true);
    expect(bike(b.id).odometerKm).toBe(5120.5);
  });

  it("leaves a bike alone when its Strava bike is gone", () => {
    const b = newBike("Road", 0);
    linkBikeToStrava(b, "b2", false);
    applyStravaGear(userId, [gear("b1", 1000)]);
    expect(bike(b.id)).toMatchObject({ stravaGearId: "b2", odometerKm: 5000 });
  });

  it("keeps a hand-entered reading across syncs", () => {
    const b = newBike("Road", 0);
    linkBikeToStrava(b, "b2", false);
    db.transaction((tx) => setOdometer(tx, bike(b.id), 5200));
    applyStravaGear(userId, [gear("b2", 5100)]);
    expect(bike(b.id).odometerKm).toBe(5300);

    db.transaction((tx) => bumpOdometer(tx, b.id, 5400));
    applyStravaGear(userId, [gear("b2", 5150)]);
    expect(bike(b.id).odometerKm).toBe(5450);
  });

  it("claims at most one sync per interval", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const later = new Date("2026-10-20T13:00:01Z");
    expect(claimStravaSync(userId, 60 * 60 * 1000, now)).toBe(true);
    expect(claimStravaSync(userId, 60 * 60 * 1000, now)).toBe(false);
    expect(claimStravaSync(userId, 60 * 60 * 1000, later)).toBe(true);
  });

  it("unlinks bikes but keeps their km on disconnect", () => {
    const b = newBike("Road", 0);
    linkBikeToStrava(b, "b2", false);
    deleteStravaConnection(userId);
    expect(getStravaConnection(userId)).toBeUndefined();
    expect(bike(b.id)).toMatchObject({ stravaGearId: null, odometerKm: 5000 });
  });
});
