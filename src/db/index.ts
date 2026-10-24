import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// `next build` imports every route in parallel workers to collect page data. None of them needs
// the real database, and several opening it at once can fail with "database is locked", so the
// build gets an in-memory one.
const building = process.env.NEXT_PHASE === "phase-production-build";
const dbPath = building
  ? ":memory:"
  : (process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bikepro.db"));

function createConnection() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { sqlite?: Database.Database };
export const sqlite = globalForDb.sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
