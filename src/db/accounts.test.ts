import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft, planBike } from "@/lib/wizard-schema";
import { getOwnedBike, getOwnedEvent, getOwnedPart, getOwnedServiceRound } from "./access";
import { setAppSetting } from "./app-settings";
import { createBike } from "./bikes";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { getBike, getBikes } from "./queries";
import { partEvents, parts, serviceRounds, sessions } from "./schema";
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  SESSION_TTL,
  validateSession,
} from "./sessions";
import {
  createUser,
  NotAdminError,
  registrationOpen,
  RegistrationError,
  setRegistrationOpen,
} from "./users";

const TODAY = "2026-10-20";
const user = (email: string) => createUser({ email, name: email, passwordHash: "x" });
const newBike = (userId: number, name: string) =>
  db.transaction((tx) => createBike(tx, planBike({ ...emptyDraft(TODAY), name }, TODAY), userId));

let alice: ReturnType<typeof user>;

beforeAll(() => {
  runMigrations();
  alice = user("Alice@Example.com ");
});

afterEach(() => {
  setAppSetting("registrationOpen", false);
});

describe("registration", () => {
  it("lets the first account register", () => {
    expect(alice.email).toBe("alice@example.com");
  });

  it("is closed after the first account until an admin opens it", () => {
    expect(registrationOpen()).toBe(false);
    expect(() => user("bob@example.com")).toThrow(RegistrationError);
    setAppSetting("registrationOpen", true);
    expect(registrationOpen()).toBe(true);
    expect(user("bob@example.com").email).toBe("bob@example.com");
  });

  it("makes the first account the admin, and later accounts regular users", () => {
    expect(alice.isAdmin).toBe(true);
    setAppSetting("registrationOpen", true);
    expect(user("erin@example.com").isAdmin).toBe(false);
  });

  it("lets only an admin open and close registration", () => {
    setRegistrationOpen(alice.id, true);
    expect(registrationOpen()).toBe(true);
    const frank = user("frank@example.com");
    expect(() => setRegistrationOpen(frank.id, true)).toThrow(NotAdminError);
    setRegistrationOpen(alice.id, false);
    expect(registrationOpen()).toBe(false);
    expect(() => setRegistrationOpen(frank.id, true)).toThrow(NotAdminError);
    expect(registrationOpen()).toBe(false);
  });

  it("refuses a second account with the same email, in any case", () => {
    setAppSetting("registrationOpen", true);
    expect(() => user("ALICE@example.com")).toThrow(/already an account/);
  });
});

describe("two accounts only see their own bikes", () => {
  it("scopes bike lists, pages and every ownership check", async () => {
    setAppSetting("registrationOpen", true);
    const carol = user("carol@example.com");
    const dave = user("dave@example.com");
    const carolsBike = newBike(carol.id, "Carol's bike");
    newBike(dave.id, "Dave's bike");

    expect((await getBikes(carol.id)).map((b) => b.name)).toEqual(["Carol's bike"]);
    expect((await getBikes(dave.id)).map((b) => b.name)).toEqual(["Dave's bike"]);
    expect(await getBike(dave.id, carolsBike.id)).toBeUndefined();
    expect((await getBike(carol.id, carolsBike.id))?.name).toBe("Carol's bike");

    const part = db.select().from(parts).where(eq(parts.bikeId, carolsBike.id)).get()!;
    const event = db.select().from(partEvents).where(eq(partEvents.partId, part.id)).get()!;
    const round = db
      .insert(serviceRounds)
      .values({ bikeId: carolsBike.id, date: TODAY, odometerKm: 0 })
      .returning()
      .get();

    expect(getOwnedBike(dave.id, carolsBike.id)).toBeUndefined();
    expect(getOwnedPart(dave.id, part.id)).toBeUndefined();
    expect(getOwnedEvent(dave.id, event.id)).toBeUndefined();
    expect(getOwnedServiceRound(dave.id, round.id)).toBeUndefined();

    expect(getOwnedPart(carol.id, part.id)?.id).toBe(part.id);
    expect(getOwnedEvent(carol.id, event.id)?.part.id).toBe(part.id);
    expect(getOwnedServiceRound(carol.id, round.id)?.id).toBe(round.id);
  });
});

describe("sessions", () => {
  it("signs in with a token and stores only its hash", () => {
    const token = createSession(alice.id);
    expect(validateSession(token)).toMatchObject({ id: alice.id, email: "alice@example.com" });
    expect(
      db
        .select()
        .from(sessions)
        .all()
        .some((s) => s.id === token),
    ).toBe(false);
    expect(validateSession("not-a-token")).toBeNull();
  });

  it("expires unused sessions and extends active ones", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const token = createSession(alice.id, start);
    const later = new Date(start.getTime() + SESSION_TTL * 0.6);
    expect(validateSession(token, later)).not.toBeNull();
    // Extended to 30 days after `later`, so it's still valid past the original expiry.
    expect(validateSession(token, new Date(start.getTime() + SESSION_TTL * 1.2))).not.toBeNull();
    expect(validateSession(token, new Date(start.getTime() + SESSION_TTL * 3))).toBeNull();
  });

  it("ends one session, or all of a user's sessions", () => {
    const a = createSession(alice.id);
    const b = createSession(alice.id);
    deleteSession(a);
    expect(validateSession(a)).toBeNull();
    expect(validateSession(b)).not.toBeNull();
    deleteUserSessions(alice.id);
    expect(validateSession(b)).toBeNull();
  });
});
