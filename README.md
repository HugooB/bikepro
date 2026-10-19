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
