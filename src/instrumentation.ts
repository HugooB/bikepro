// Runs once when the Next.js server starts: bring the SQLite schema up to date.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./db/migrate");
    runMigrations();
  }
}
