import { beforeAll, describe, expect, it } from "vitest";
import { emptyDraft, planBike } from "@/lib/wizard-schema";
import { setAppSetting } from "./app-settings";
import { createBike } from "./bikes";
import { buildExport, EXPORT_VERSION } from "./export";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { createServiceRound } from "./service-rounds";
import { saveStravaConnection } from "./strava";
import { createUser, findUserByEmail, setPreferences } from "./users";

const TODAY = "2026-10-21";
let alice: number;
let bob: number;

beforeAll(() => {
  process.env.STRAVA_CLIENT_SECRET = "test-secret";
  runMigrations();
  alice = createUser({ email: "alice@example.com", name: "Alice", passwordHash: "secret-hash" }).id;
  setAppSetting("registrationOpen", true);
  bob = createUser({ email: "bob@example.com", name: "Bob", passwordHash: "x" }).id;
  setAppSetting("registrationOpen", false);

  const plan = (name: string) => planBike({ ...emptyDraft(TODAY), name }, TODAY);
  const road = db.transaction((tx) => createBike(tx, plan("Road"), alice));
  db.transaction((tx) => createBike(tx, plan("Bob's bike"), bob));
  createServiceRound({
    bikeId: road.id,
    date: TODAY,
    odometerKm: 0,
    totalCost: 80,
    parts: [],
  });
  saveStravaConnection(alice, {
    athleteId: 1,
    athleteName: "Alice R",
    scope: "read,profile:read_all",
    tokens: { accessToken: "tok-a", refreshToken: "tok-r", expiresAt: new Date() },
  });
});

describe("buildExport", () => {
  it("contains the user's bikes with their parts, events and rounds", () => {
    const data = buildExport(alice, new Date("2026-10-21T08:00:00Z"));
    expect(data).toMatchObject({
      app: "BikePro",
      version: EXPORT_VERSION,
      exportedAt: "2026-10-21T08:00:00.000Z",
      user: { name: "Alice", email: "alice@example.com" },
      strava: { athleteName: "Alice R" },
    });
    expect(data.bikes.map((b) => b.name)).toEqual(["Road"]);
    const bike = data.bikes[0]!;
    expect(bike.parts.length).toBeGreaterThan(0);
    expect(bike.parts.every((p) => p.events.some((e) => e.type === "installed"))).toBe(true);
    expect(bike.serviceRounds).toMatchObject([{ totalCost: 80 }]);
  });

  it("stays in km with a currency code, whatever the display settings", () => {
    expect(findUserByEmail("alice@example.com")).toMatchObject({
      distanceUnit: "km",
      currency: "EUR",
    });
    const before = buildExport(alice);
    setPreferences(alice, { distanceUnit: "mi", currency: "USD", locale: "en" });
    const after = buildExport(alice);
    expect(after).toMatchObject({ distanceUnit: "km", currency: "USD" });
    expect(after.bikes).toEqual(before.bikes);
    setPreferences(alice, { distanceUnit: "km", currency: "EUR", locale: "en" });
  });

  it("leaves out other users' data and every secret", () => {
    const json = JSON.stringify(buildExport(alice));
    expect(json).not.toContain("Bob");
    expect(json).not.toContain("secret-hash");
    expect(json).not.toContain("tok-");
    expect(json).not.toMatch(/passwordHash|accessToken|refreshToken/);
  });
});
