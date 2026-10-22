// Runs once when the Next.js server starts: bring the SQLite schema up to date, then create
// or promote the admin account from ADMIN_EMAIL.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./db/migrate");
    runMigrations();
    const { bootstrapAccounts } = await import("./lib/auth/bootstrap");
    await bootstrapAccounts();
  }
}
