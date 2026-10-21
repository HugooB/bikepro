# BikePro

Self-hosted web app for tracking maintenance and part wear on your bikes. See [PLAN.md](PLAN.md) for the full plan and milestones.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests (Vitest)
npm run lint
npm run format       # Prettier
```

The first account you create (at `/register`) owns any bikes that existed before accounts. Add bikes in the app with the add-bike wizard (`/bikes/new`). For development, `npm run db:seed` creates a sample race bike with all default parts (add `-- --reset` to start over); it refuses to run in production.

Data lives in a SQLite file at `data/bikepro.db` (override with `DATABASE_PATH`). Migrations in `drizzle/` run automatically when the server starts.

### Changing the database schema

1. Edit `src/db/schema.ts`
2. `npm run db:generate` to create a migration in `drizzle/`
3. Restart the dev server to apply it (`npm run db:studio` to browse data)

## Running with Docker

```bash
cp .env.example .env   # optional
docker compose up --build -d
```

The app runs on port 3000. The database is stored in the `bikepro-data` volume, so it survives restarts and rebuilds. `GET /api/health` reports app and database status.

To update to a new version: `git pull && docker compose up --build -d`. Migrations run automatically when the container starts.

### Reaching it from outside your home network

Put BikePro behind a reverse proxy that handles HTTPS, and don't expose port 3000 directly. With [Caddy](https://caddyserver.com), which gets certificates by itself, the whole `Caddyfile` is:

```
bikes.example.com {
	reverse_proxy localhost:3000
}
```

Then set in `.env` and restart:

- `APP_URL=https://bikes.example.com`. This marks the sign-in cookie as HTTPS-only and gives Strava the right callback address.
- In your Strava API application, set **Authorization Callback Domain** to `bikes.example.com`.

Any other proxy (nginx, Traefik, a Cloudflare Tunnel) works the same way: forward to port 3000 and terminate HTTPS in front of it.

### Backups

All data is in one SQLite file inside the `bikepro-data` volume. Copy it safely while the app runs with:

```bash
docker compose exec bikepro node -e "require('better-sqlite3')('/app/data/bikepro.db').backup('/app/data/backup.db').then(() => console.log('ok'))"
docker compose cp bikepro:/app/data/backup.db ./bikepro-backup.db
```

To restore, stop the app, copy the file back to `/app/data/bikepro.db` in the volume, and start it again. Each user can also download their own data as JSON in Settings → Your data.

### Accounts

- Open the app and create the first account; it's always allowed, so a fresh install works.
- After that, registration is closed. To let someone else sign up, set `ALLOW_REGISTRATION=true` in `.env`, restart, and remove it again once they're in.
- Passwords are hashed with scrypt. Sessions live in the database, so signing out (or "Sign out everywhere" in Settings) ends them immediately; unused sessions expire after 30 days.
- Behind HTTPS (recommended whenever the app is reachable outside your home network), set `APP_URL=https://…` so the sign-in cookie is only ever sent over HTTPS.

### Strava

Bikes linked to Strava take their kilometres from Strava's total for that bike, updated when you open BikePro (at most once an hour) or with "Sync now" in Settings. BikePro only reads your bikes and their distance, never your rides.

1. Create an API application at [strava.com/settings/api](https://www.strava.com/settings/api). Set **Authorization Callback Domain** to the host BikePro runs on, without `http://` or a port: `localhost` for development, or e.g. `bikes.example.com`.
2. Put its **Client ID** and **Client Secret** in `.env` as `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`, and set `APP_URL` to the address you open BikePro on. Restart.
3. In BikePro, go to Settings → Strava → **Connect with Strava**, then pick which Strava bike belongs to each BikePro bike. New bikes can be linked in the add-bike wizard.

When linking a bike whose odometer differs from Strava's total, you choose: keep your reading and add new Strava km on top of it, or jump to Strava's total (every part then counts the difference as ridden). Correcting the odometer by hand later works the same way, and syncs keep adding to it.

Strava tokens are stored encrypted with a key derived from `STRAVA_CLIENT_SECRET`. If you change the secret, connect Strava again.
