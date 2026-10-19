import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Run `npm run db:generate` after changing this file to create a migration.
// Calendar dates (purchase, install, event dates) are stored as "YYYY-MM-DD" text.

export const bikeTypes = ["road", "gravel", "tt", "other"] as const;
export type BikeType = (typeof bikeTypes)[number];

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

export const bikes = sqliteTable("bikes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Nullable until accounts arrive in M7.
  userId: integer("user_id"),
  name: text("name").notNull(),
  type: text("type", { enum: bikeTypes }).notNull().default("road"),
  brand: text("brand"),
  model: text("model"),
  color: text("color"),
  purchasedAt: text("purchased_at"),
  odometerKm: real("odometer_km").notNull().default(0),
  stravaGearId: text("strava_gear_id"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
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
    intervalKm: integer("interval_km"),
    intervalDays: integer("interval_days"),
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
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("part_events_part_idx").on(t.partId, t.date)],
);

export type Bike = typeof bikes.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type PartEvent = typeof partEvents.$inferSelect;
