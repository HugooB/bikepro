import { eq, inArray } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { emptyDraft, planBike } from "@/lib/wizard-schema";
import { setAppSetting } from "./app-settings";
import { createBike } from "./bikes";
import { buildExport } from "./export";
import { importData, ImportError } from "./import";
import { db, sqlite } from "./index";
import { runMigrations } from "./migrate";
import {
  bikes,
  partEvents,
  parts,
  serviceRounds,
  sessions,
  stravaConnections,
  users,
} from "./schema";
import { createServiceRound } from "./service-rounds";
import { createSession, deleteOtherSessions, validateSession } from "./sessions";
import { linkBikeToStrava, saveStravaConnection, applyStravaGear } from "./strava";
import {
  AccountError,
  createUser,
  deleteAccount,
  findUserByEmail,
  NotAdminError,
  resetPassword,
} from "./users";

// The command-line fallback is plain JavaScript; it must write hashes the app can check.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cli = require("../../scripts/reset-password.js");

const TODAY = "2026-10-23";
const plan = (name: string) => planBike({ ...emptyDraft(TODAY), name }, TODAY);

let admin: number;
let alice: number;
let bob: number;

beforeAll(() => {
  process.env.STRAVA_CLIENT_SECRET = "test-secret";
  runMigrations();
  admin = createUser({ email: "admin@example.com", name: "Admin", passwordHash: "x" }).id;
  setAppSetting("registrationOpen", true);
  alice = createUser({ email: "alice@example.com", name: "Alice", passwordHash: "x" }).id;
  bob = createUser({ email: "bob@example.com", name: "Bob", passwordHash: "x" }).id;
  setAppSetting("registrationOpen", false);
});

/** A bike with history: a service round that replaced a part, a retired bike, and Strava. */
function seedBikes(userId: number) {
  const road = db.transaction((tx) => createBike(tx, plan("Road"), userId));
  const chain = db
    .select()
    .from(parts)
    .where(eq(parts.bikeId, road.id))
    .all()
    .find((p) => p.kind === "chain")!;
  createServiceRound({
    bikeId: road.id,
    date: TODAY,
    shop: "Local shop",
    odometerKm: 1500,
    totalCost: 95,
    parts: [{ partId: chain.id, type: "replaced", note: "Stretched" }],
  });
  const gravel = db.transaction((tx) => createBike(tx, plan("Gravel"), userId));
  db.update(bikes)
    .set({ archivedAt: new Date("2026-10-01T00:00:00Z") })
    .where(eq(bikes.id, gravel.id))
    .run();

  saveStravaConnection(userId, {
    athleteId: userId * 1000,
    athleteName: "Strava name",
    scope: "read,profile:read_all",
    tokens: { accessToken: "a", refreshToken: "r", expiresAt: new Date() },
  });
  applyStravaGear(userId, [
    { id: `b${userId}`, name: "Road", distanceKm: 1500, primary: true, retired: false },
  ]);
  linkBikeToStrava(db.select().from(bikes).where(eq(bikes.id, road.id)).get()!, `b${userId}`, true);
  return { road, gravel };
}

const omit = <T extends object, K extends keyof T>(obj: T, ...keys: K[]) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>;

/** An export with every id replaced by its position, so two exports can be compared. */
function structure(data: ReturnType<typeof buildExport>) {
  return data.bikes.map((bike) => {
    const partIndex = new Map(bike.parts.map((p, i) => [p.id, i]));
    const roundIndex = new Map(bike.serviceRounds.map((r, i) => [r.id, i]));
    return {
      ...omit(bike, "id", "userId", "parts", "serviceRounds"),
      // Strava links aren't imported.
      stravaGearId: null,
      stravaDistanceKm: null,
      stravaOffsetKm: 0,
      serviceRounds: bike.serviceRounds.map((r) => omit(r, "id", "bikeId")),
      parts: bike.parts.map((p) => ({
        ...omit(p, "id", "bikeId", "replacedByPartId", "events"),
        replacedBy: p.replacedByPartId === null ? null : partIndex.get(p.replacedByPartId),
        events: p.events.map((e) => ({
          ...omit(e, "id", "partId", "createdAt", "serviceRoundId"),
          round: e.serviceRoundId === null ? null : roundIndex.get(e.serviceRoundId),
        })),
      })),
    };
  });
}

describe("change password", () => {
  it("ends the user's other sessions and keeps the current one", () => {
    const current = createSession(alice);
    const phone = createSession(alice);
    const bobs = createSession(bob);
    deleteOtherSessions(alice, current);
    expect(validateSession(current)?.id).toBe(alice);
    expect(validateSession(phone)).toBeNull();
    expect(validateSession(bobs)?.id).toBe(bob);
  });
});

describe("admin password reset", () => {
  it("sets the new hash and signs the user out everywhere", () => {
    const token = createSession(bob);
    resetPassword(admin, bob, "new-hash");
    expect(findUserByEmail("bob@example.com")?.passwordHash).toBe("new-hash");
    expect(validateSession(token)).toBeNull();
  });

  it("is refused for anyone who isn't an admin, and for the admin's own account", () => {
    expect(() => resetPassword(alice, bob, "h")).toThrow(NotAdminError);
    expect(() => resetPassword(admin, admin, "h")).toThrow(AccountError);
    expect(() => resetPassword(admin, 9999, "h")).toThrow(AccountError);
  });

  it("works from the command line with a hash the app accepts", async () => {
    const token = createSession(alice);
    const password = cli.resetPassword(sqlite, " Alice@Example.com ");
    expect(password).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    expect(await verifyPassword(password, findUserByEmail("alice@example.com")!.passwordHash)).toBe(
      true,
    );
    expect(validateSession(token)).toBeNull();
    expect(cli.resetPassword(sqlite, "nobody@example.com")).toBeNull();
  });
});

describe("delete account", () => {
  it("removes the user and every row that belonged to them", () => {
    setAppSetting("registrationOpen", true);
    const carol = createUser({ email: "carol@example.com", name: "Carol", passwordHash: "x" }).id;
    setAppSetting("registrationOpen", false);
    const { road } = seedBikes(carol);
    createSession(carol);
    const bobsBike = db.transaction((tx) => createBike(tx, plan("Bob's bike"), bob));

    const bikeIds = db.select({ id: bikes.id }).from(bikes).where(eq(bikes.userId, carol)).all();
    const partIds = db
      .select({ id: parts.id })
      .from(parts)
      .where(
        inArray(
          parts.bikeId,
          bikeIds.map((b) => b.id),
        ),
      )
      .all()
      .map((p) => p.id);
    expect(partIds.length).toBeGreaterThan(0);

    deleteAccount(carol);

    expect(db.select().from(users).where(eq(users.id, carol)).get()).toBeUndefined();
    expect(db.select().from(bikes).where(eq(bikes.userId, carol)).all()).toEqual([]);
    expect(db.select().from(parts).where(inArray(parts.id, partIds)).all()).toEqual([]);
    expect(db.select().from(partEvents).where(inArray(partEvents.partId, partIds)).all()).toEqual(
      [],
    );
    expect(db.select().from(serviceRounds).where(eq(serviceRounds.bikeId, road.id)).all()).toEqual(
      [],
    );
    expect(db.select().from(sessions).where(eq(sessions.userId, carol)).all()).toEqual([]);
    expect(
      db.select().from(stravaConnections).where(eq(stravaConnections.userId, carol)).all(),
    ).toEqual([]);
    // Nobody else's data is touched.
    expect(db.select().from(bikes).where(eq(bikes.id, bobsBike.id)).get()).toBeDefined();
  });

  it("is refused for the admin", () => {
    expect(() => deleteAccount(admin)).toThrow(AccountError);
    expect(findUserByEmail("admin@example.com")).toBeDefined();
  });
});

describe("import", () => {
  it("recreates an export with the same structure and new ids", () => {
    seedBikes(alice);
    const exported = JSON.parse(JSON.stringify(buildExport(alice)));
    const before = buildExport(alice);

    expect(importData(bob, exported)).toEqual({
      bikes: 2,
      parts: before.bikes.reduce((n, b) => n + b.parts.length, 0),
      events: before.bikes.reduce(
        (n, b) => n + b.parts.reduce((m, p) => m + p.events.length, 0),
        0,
      ),
    });

    const imported = buildExport(bob).bikes.filter((b) => b.name !== "Bob's bike");
    expect(structure({ ...before, bikes: imported })).toEqual(structure(before));
    expect(imported.every((b) => b.stravaGearId === null)).toBe(true);
    expect(imported.map((b) => b.odometerKm)).toEqual(before.bikes.map((b) => b.odometerKm));

    const oldIds = new Set(before.bikes.flatMap((b) => [b.id, ...b.parts.map((p) => p.id)]));
    expect(imported.some((b) => oldIds.has(b.id) || b.parts.some((p) => oldIds.has(p.id)))).toBe(
      false,
    );
    // The replaced chain still points at its successor, now on the new bike.
    const road = imported.find((b) => b.name === "Road")!;
    const retired = road.parts.find((p) => p.status === "retired")!;
    expect(road.parts.map((p) => p.id)).toContain(retired.replacedByPartId);
    expect(retired.events.at(-1)?.serviceRoundId).toBe(road.serviceRounds[0]!.id);
  });

  it("gives bikes from older exports tubeless tires only when they have sealant", () => {
    const exported = JSON.parse(JSON.stringify(buildExport(alice)));
    const [first, second] = exported.bikes;
    for (const bike of exported.bikes) delete bike.tireType;
    first.parts.push({ ...first.parts[0], kind: "sealant", replacedByPartId: null });
    second.parts = second.parts.filter((p: { kind: string }) => p.kind !== "sealant");
    exported.bikes = [first, second];

    const ids = new Set(buildExport(bob).bikes.map((b) => b.id));
    importData(bob, exported);
    const added = buildExport(bob).bikes.filter((b) => !ids.has(b.id));
    expect(added.map((b) => b.tireType)).toEqual(["tubeless", "tubes"]);
  });

  it("rejects an invalid file without writing anything", () => {
    const count = () => db.select({ id: bikes.id }).from(bikes).all().length;
    const before = count();
    const valid = JSON.parse(JSON.stringify(buildExport(alice)));
    const broken = structuredClone(valid);
    // The first bike is fine; the second one is damaged, so the first mustn't be saved either.
    broken.bikes[1].parts[0].category = "engine";

    expect(() => importData(bob, broken)).toThrow(ImportError);
    expect(() => importData(bob, { hello: "world" })).toThrow(/isn't a BikePro export/);
    expect(() => importData(bob, { ...valid, version: 99 })).toThrow(/newer BikePro/);
    expect(() => importData(bob, { ...valid, bikes: "nope" })).toThrow(ImportError);
    expect(count()).toBe(before);
  });
});
