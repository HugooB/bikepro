<div align="center">

<img src="src/app/icon.svg" width="80" height="80" alt="BikePro logo">

# BikePro

**Know when your chain, tyres and brake pads need attention, before they let you down.**

A self-hosted maintenance tracker for your bikes: part wear, service history and costs,<br>
with kilometres synced from Strava.

[![License: MIT](https://img.shields.io/badge/license-MIT-2f49d1.svg)](LICENSE)
[![Self-hosted with Docker](https://img.shields.io/badge/self--hosted-Docker-2f49d1.svg)](#quick-start)

<img src="docs/screenshots/bike.png" alt="BikePro showing a road bike drawing with every part coloured by condition, next to the list of parts" width="100%">

</div>

## Why BikePro?

Every part of a bike wears at its own pace. A chain wants cleaning every few hundred kilometres and replacing after a few thousand. Tyres age even when you don't ride, and brake fluid needs a yearly bleed. Most riders keep this in their head, or don't keep it at all.

BikePro keeps it for you. Add your bike once and it tracks every part's age and kilometres, and tells you in plain words which ones are in good condition, which need a service, and which need replacing. It runs on your own server, keeps everything in a single SQLite file, and needs no subscription.

## Features

- **Every part at a glance.** An interactive drawing of your bike colours each part green, orange or red by condition. Tap a part to jump to it in the list.
- **Service and replacement intervals.** Each part has two clocks: how often it needs servicing, counted from the last service, and how long it lasts, counted from when it was fitted. Defaults come from published maintenance guides (sources in [`default-parts.ts`](src/lib/default-parts.ts)), and every value can be changed per part.
- **Full history.** Log cleaning, servicing and adjustments per part, record a shop visit covering many parts at once as a service round, and replace parts while keeping the old one's lifetime km, age and price.
- **Costs.** Purchase price, part prices and service bills add up to a total cost per bike, with cost per year of ownership, maintenance per 1,000 km, and charts per year and category.
- **Strava sync (optional).** Link each bike to its Strava bike and the odometer follows Strava's total automatically. BikePro reads only your bikes' total distance, never your rides.
- **Guided setup.** A five-step wizard picks sensible parts for road, gravel or TT bikes, with disc or rim brakes, and ages parts you've already replaced correctly.
- **Made for phones and desktops.** Large tap targets on phones, a two-column layout on desktop.
- **Your data stays yours.** Multiple accounts on one install, each seeing only their own bikes. Every user can download a JSON copy of their data.

<div align="center">
<img src="docs/screenshots/mobile.png" alt="On a phone: a chain's condition with service and replacement progress bars, and the add-bike wizard" width="80%">
<br><br>
<img src="docs/screenshots/costs.png" alt="The Costs tab: total cost, cost per year of ownership, and maintenance charts per year and per category" width="100%">
</div>

## Quick start

You need [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

```bash
git clone https://github.com/HugooB/bikepro.git
cd bikepro
cp .env.example .env
docker compose up -d --build
```

Open <http://localhost:3000>, create your account, and the wizard walks you through adding your first bike.

The database lives in the `bikepro-data` Docker volume, so it survives restarts and updates. `GET /api/health` reports whether the app and database are up.

## Configuration

All settings go in `.env`. Restart after changing them (`docker compose up -d`).

| Variable                                   | Default                 | What it does                                                                                                                                                                        |
| ------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                  | `http://localhost:3000` | The address you open BikePro on. Set it to your `https://` address when running behind HTTPS: this keeps the sign-in cookie HTTPS-only and gives Strava the right callback address. |
| `ALLOW_REGISTRATION`                       | `false`                 | The first account can always be created. After that, set this to `true` to let someone else sign up, then set it back.                                                              |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | empty                   | Turn on Strava sync. See [Strava](#strava).                                                                                                                                         |
| `DATABASE_PATH`                            | `data/bikepro.db`       | Where the SQLite file is stored.                                                                                                                                                    |

## Strava

Linked bikes take their kilometres from Strava's total for that bike. BikePro syncs when you open it, at most once an hour, or straight away with **Sync now** in Settings.

1. Create an API application at [strava.com/settings/api](https://www.strava.com/settings/api). Set **Authorization Callback Domain** to the host you run BikePro on, without `http://` or a port: `localhost` on your own machine, or for example `bikes.example.com`.
2. Copy its **Client ID** and **Client Secret** into `.env` as `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`, set `APP_URL`, and restart.
3. In BikePro, go to **Settings → Strava → Connect with Strava**, then choose which Strava bike belongs to each of your bikes. You can also link a bike while adding it.

If a bike's odometer differs from Strava's total when you link it, you choose: keep your reading and add new Strava kilometres on top, or switch to Strava's total. Strava tokens are stored encrypted with a key derived from `STRAVA_CLIENT_SECRET`; if you change the secret, connect Strava again.

## Running it on your own domain

To use BikePro away from home, put it behind a reverse proxy that handles HTTPS, and don't expose port 3000 directly. With [Caddy](https://caddyserver.com), which gets certificates by itself, the whole `Caddyfile` is:

```
bikes.example.com {
	reverse_proxy localhost:3000
}
```

Then set `APP_URL=https://bikes.example.com` in `.env`, restart, and use `bikes.example.com` as the Strava callback domain. nginx, Traefik or a Cloudflare Tunnel work the same way: terminate HTTPS and forward to port 3000.

## Updating and backups

**Update** to the latest version. Database migrations run automatically on start:

```bash
git pull
docker compose up -d --build
```

**Back up** the database while BikePro runs:

```bash
docker compose exec bikepro node -e "require('better-sqlite3')('/app/data/bikepro.db').backup('/app/data/backup.db').then(() => console.log('ok'))"
docker compose cp bikepro:/app/data/backup.db ./bikepro-backup.db
```

To restore, stop BikePro, copy the file back to `/app/data/bikepro.db` in the volume, and start it again. Each user can also download their own data as JSON under **Settings → Your data**.

## Accounts and security

- The first account can always be created, so a fresh install just works. After that, registration is closed unless `ALLOW_REGISTRATION=true`.
- Passwords are hashed with scrypt. Sessions are stored in the database, so signing out (or **Sign out everywhere** in Settings) ends them immediately. Unused sessions expire after 30 days.
- After 10 failed sign-ins for an account, further attempts are refused for 15 minutes.

## Good to know

- Distances are in kilometres and amounts in euros; there's no setting for miles or other currencies yet.
- The interface is in English.
- BikePro shows each part's condition in the app. It doesn't send notifications or emails.
- Strava sync reads your bikes' totals only. It doesn't import rides, and there are no webhooks, so kilometres update when you open the app.

## Development

You need Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests (Vitest)
npm run lint
npm run format       # Prettier
```

`npm run db:seed` adds a sample race bike with every default part (`npm run db:seed -- --reset` starts over). It refuses to run in production. Locally, data lives in `data/bikepro.db`.

To change the database schema, edit `src/db/schema.ts`, run `npm run db:generate` to create a migration in `drizzle/`, and restart the dev server to apply it. `npm run db:studio` lets you browse the data.

**Built with** [Next.js](https://nextjs.org) 16 and React 19, [SQLite](https://sqlite.org) through [Drizzle ORM](https://orm.drizzle.team), [Tailwind CSS](https://tailwindcss.com) 4 and [Radix UI](https://www.radix-ui.com), with [zod](https://zod.dev) for validation and [Vitest](https://vitest.dev) for tests.

## Contributing

Issues and pull requests are welcome. Before opening a pull request, please make sure `npm test` and `npm run lint` pass, and run `npm run format`.

## License

[MIT](LICENSE) © Hugo Bijmans
