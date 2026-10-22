import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Run `npm run db:generate` after changing this file to create a migration.
// Calendar dates (purchase, install, event dates) are stored as "YYYY-MM-DD" text.

export const bikeTypes = ["road", "gravel", "tt", "other"] as const;
export type BikeType = (typeof bikeTypes)[number];

export const brakeTypes = ["disc", "rim"] as const;
export type BrakeType = (typeof brakeTypes)[number];

export const partCategories = ["drivetrain", "wheels", "brakes", "contact"] as const;
export type PartCategory = (typeof partCategories)[number];

export const partEventTypes = [
  "installed",
  "serviced",
  "adjusted",
  "cleaned",
  "replaced",
  "note",
] as const;
export type PartEventType = (typeof partEventTypes)[number];

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Stored lowercased, so sign-in ignores case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  /** Admins manage the install itself, such as whether others may register. */
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Install-wide settings as key/value pairs (see db/app-settings.ts for the keys). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the token itself only lives in the user's cookie. */
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const bikes = sqliteTable(
  "bikes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Owner. Bikes from before accounts existed have none until the first user signs up. */
    userId: integer("user_id"),
    name: text("name").notNull(),
    type: text("type", { enum: bikeTypes }).notNull().default("road"),
    /** Picks the brake parts in the template and how the drawing shows the brakes. */
    brakeType: text("brake_type", { enum: brakeTypes }).notNull().default("disc"),
    brand: text("brand"),
    model: text("model"),
    color: text("color"),
    purchasedAt: text("purchased_at"),
    /** What the user paid for the bike, in euros; counted as a cost on the purchase date. */
    purchasePrice: real("purchase_price"),
    odometerKm: real("odometer_km").notNull().default(0),
    /** Linked Strava bike ("b1234567"). While linked, syncs set odometerKm = Strava km + offset. */
    stravaGearId: text("strava_gear_id"),
    /** The linked Strava bike's total distance at the last sync. */
    stravaDistanceKm: real("strava_distance_km"),
    /** Kept between Strava's total and the odometer, e.g. when the user keeps their own reading. */
    stravaOffsetKm: real("strava_offset_km").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("bikes_user_idx").on(t.userId),
    // One Strava bike counts towards one BikePro bike only.
    uniqueIndex("bikes_strava_gear_unique").on(t.stravaGearId),
  ],
);

/** A bike in the user's Strava account, as cached at the last sync. */
export type StravaGear = {
  id: string;
  name: string;
  distanceKm: number;
  primary: boolean;
  retired: boolean;
};

export const stravaConnections = sqliteTable("strava_connections", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** A Strava account connects to one BikePro account only. */
  athleteId: integer("athlete_id").notNull().unique(),
  athleteName: text("athlete_name").notNull(),
  /** Tokens are encrypted (see lib/strava/crypto), so a copy of the database can't use them. */
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  scope: text("scope").notNull(),
  gear: text("gear", { mode: "json" }).$type<StravaGear[]>().notNull().default([]),
  /** Last successful sync. */
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  /** Last sync attempt, successful or not; spaces out automatic syncs. */
  syncAttemptAt: integer("sync_attempt_at", { mode: "timestamp" }),
  /** Why the last sync failed: "revoked" needs a reconnect, "failed" is worth a retry. */
  syncError: text("sync_error", { enum: ["revoked", "failed"] }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const parts = sqliteTable(
  "parts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bikeId: integer("bike_id")
      .notNull()
      .references(() => bikes.id, { onDelete: "cascade" }),
    category: text("category", { enum: partCategories }).notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    model: text("model"),
    svgZone: text("svg_zone"),
    installedAt: text("installed_at").notNull(),
    installedKm: real("installed_km").notNull().default(0),
    /** How often it needs servicing; counted from its last service (see lib/status). */
    serviceIntervalKm: integer("service_interval_km"),
    serviceIntervalDays: integer("service_interval_days"),
    /** Its maximum life; counted from installation. */
    replaceIntervalKm: integer("replace_interval_km"),
    replaceIntervalDays: integer("replace_interval_days"),
    cost: real("cost"),
    status: text("status", { enum: ["active", "retired"] })
      .notNull()
      .default("active"),
    retiredAt: text("retired_at"),
    retiredKm: real("retired_km"),
    replacedByPartId: integer("replaced_by_part_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("parts_bike_idx").on(t.bikeId, t.status)],
);

export const serviceRounds = sqliteTable(
  "service_rounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bikeId: integer("bike_id")
      .notNull()
      .references(() => bikes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    shop: text("shop"),
    odometerKm: real("odometer_km").notNull(),
    totalCost: real("total_cost"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("service_rounds_bike_idx").on(t.bikeId, t.date)],
);

export const partEvents = sqliteTable(
  "part_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    partId: integer("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    odometerKm: real("odometer_km"),
    type: text("type", { enum: partEventTypes }).notNull(),
    description: text("description"),
    cost: real("cost"),
    /** Whether this event restarts the part's service interval (e.g. serviced, replaced). */
    resetsInterval: integer("resets_interval", { mode: "boolean" }).notNull().default(false),
    /** Set when the event was logged as part of a service round; the round links its parts. */
    serviceRoundId: integer("service_round_id").references(() => serviceRounds.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("part_events_part_idx").on(t.partId, t.date)],
);

export const serviceRoundsRelations = relations(serviceRounds, ({ many }) => ({
  events: many(partEvents),
}));

export const partEventsRelations = relations(partEvents, ({ one }) => ({
  part: one(parts, { fields: [partEvents.partId], references: [parts.id] }),
  serviceRound: one(serviceRounds, {
    fields: [partEvents.serviceRoundId],
    references: [serviceRounds.id],
  }),
}));

export const partsRelations = relations(parts, ({ many }) => ({
  events: many(partEvents),
}));

export type User = typeof users.$inferSelect;
export type Bike = typeof bikes.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type PartEvent = typeof partEvents.$inferSelect;
export type ServiceRound = typeof serviceRounds.$inferSelect;
export type StravaConnection = typeof stravaConnections.$inferSelect;
