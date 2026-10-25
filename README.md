<div align="center">

<img src="src/app/icon.svg" width="80" height="80" alt="BikePro logo">

# BikePro

**Know when your chain, tires and brake pads need attention, before they let you down.**

A self-hosted maintenance tracker for your bikes: part wear, service history and costs,<br>
with distances synced from Strava. In English or Dutch, in kilometers or miles.

[![Latest release](https://img.shields.io/github/v/release/HugooB/bikepro?label=version&color=2f49d1)](https://github.com/HugooB/bikepro/releases/latest)
[![CI](https://github.com/HugooB/bikepro/actions/workflows/ci.yml/badge.svg)](https://github.com/HugooB/bikepro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2f49d1.svg)](LICENSE)
[![Self-hosted with Docker](https://img.shields.io/badge/self--hosted-Docker-2f49d1.svg)](#quick-start)

<img src="docs/screenshots/bike.png" alt="BikePro showing a road bike drawing with every part colored by condition, next to the list of parts" width="100%">

</div>

## Why BikePro?

Every part of a bike wears at its own pace. A chain wants cleaning every few hundred kilometers and replacing after a few thousand. Tires age even when you don't ride, and brake fluid needs a yearly bleed. Most riders keep this in their head, or don't keep it at all.

BikePro keeps it for you. Add your bike once and it tracks every part's age and distance, and tells you in plain words which ones are in good condition, which need a service, and which need replacing. It runs on your own server, keeps everything in a single SQLite file, and needs no subscription.

## Features

- **Every part at a glance.** An interactive drawing of your bike colors each part green, orange or red by condition. Tap a part to jump to it in the list.
- **Service and replacement intervals.** Each part has two clocks: how often it needs servicing, counted from the last service, and how long it lasts, counted from when it was fitted. Defaults come from published maintenance guides (sources in [`default-parts.ts`](src/lib/default-parts.ts)), and every value can be changed per part.
- **Full history.** Log cleaning, servicing and adjustments per part, record a shop visit covering many parts at once as a service round, and replace parts while keeping the old one's lifetime distance, age and price.
- **Costs.** Purchase price, part prices and service bills add up to a total cost per bike, with cost per year of ownership, maintenance per 1,000 km or miles, and charts per year and category.
- **Strava sync (optional).** Link each bike to its Strava bike and the odometer follows Strava's total automatically. BikePro reads only your bikes' total distance, never your rides.
- **Guided setup.** A five-step wizard adds your bike with a standard list of parts that matches its disc or rim brakes. Untick what your bike doesn't have, and parts you've replaced since buying it get the right age from day one.
- **Your units, your language.** Each rider picks kilometers or miles, any currency, and English or Dutch. Switching never changes the data: BikePro stores kilometers, and amounts aren't converted between currencies. New languages are welcome: see [Adding a language](CONTRIBUTING.md#adding-a-language).
- **For the whole household.** One install holds several accounts, each seeing only their own bikes. The admin decides who can sign up and can reset a forgotten password.
- **Your data stays yours.** Download everything as a JSON file, import it into another BikePro, or delete your account and all its data.
- **Made for phones and desktops.** Install it on your home screen and it opens like an app, full screen with its own icon. Large tap targets on phones, a two-column layout on desktop.

<div align="center">
<img src="docs/screenshots/mobile.png" alt="On a phone: a chain's condition with service and replacement progress bars, and the add-bike wizard" width="80%">
<br><br>
<img src="docs/screenshots/costs.png" alt="The Costs tab: total cost, cost per year of ownership, and maintenance charts per year and per category" width="100%">
</div>

## Quick start

You need [Docker](https://docs.docker.com/get-docker/) with Docker Compose. BikePro runs from a ready-made image for regular computers (amd64) and ARM machines such as Apple Silicon Macs and the [Raspberry Pi](#running-on-a-raspberry-pi) (arm64), so there's nothing to clone or build.

```bash
mkdir bikepro && cd bikepro
curl -fsSLO https://raw.githubusercontent.com/HugooB/bikepro/main/docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/HugooB/bikepro/main/.env.example -o .env
# set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then:
docker compose up -d
```

BikePro creates your admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on its first start. Open <http://localhost:3000>, sign in, and the wizard walks you through adding your first bike.

The database lives in the `bikepro-data` Docker volume, so it survives restarts and updates. `GET /api/health` reports whether the app and database are up.

`docker-compose.yml` uses `ghcr.io/hugoob/bikepro:latest`. For updates only when you choose, pin a version instead, such as `ghcr.io/hugoob/bikepro:1.0` (bug fixes within 1.0) or `:1.0.0` (exactly that release).

### Build it your self

You can also choose to build BikePro yourself. In that case, clone this repository and let Docker build the application for you through Docker compose.

```bash
git clone https://github.com/HugooB/bikepro.git
cd bikepro
# set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then:
docker compose up --build -d
```

## Configuration

All settings go in `.env`. Restart after changing them (`docker compose up -d`).

| Variable                                   | Default                 | What it does                                                                                                                                                                                                                      |
| ------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                  | `http://localhost:3000` | The address you open BikePro on. Set it to your `https://` address when running behind HTTPS: this keeps the sign-in cookie HTTPS-only and gives Strava the right callback address.                                               |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`            | empty                   | Create the admin account on start, so nobody else can claim a fresh install. The password is only used to create the account: changing it later has no effect. If an account with this email already exists, it becomes an admin. |
| `ADMIN_NAME`                               | `Admin`                 | The admin account's display name.                                                                                                                                                                                                 |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | empty                   | Turn on Strava sync. See [Strava](#strava).                                                                                                                                                                                       |
| `DATABASE_PATH`                            | `data/bikepro.db`       | Where the SQLite file is stored.                                                                                                                                                                                                  |

## Strava

Linked bikes take their kilometers from Strava's total for that bike. BikePro syncs when you open it, at most once an hour, or straight away with **Sync now** in Settings.

1. Create an API application at [strava.com/settings/api](https://www.strava.com/settings/api). Set **Authorization Callback Domain** to the host you run BikePro on, without `http://` or a port: `localhost` on your own machine, or for example `bikes.example.com`.
2. Copy its **Client ID** and **Client Secret** into `.env` as `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`, set `APP_URL`, and restart.
3. In BikePro, go to **Settings → Strava → Connect with Strava**, then choose which Strava bike belongs to each of your bikes. You can also link a bike while adding it.

If a bike's odometer differs from Strava's total when you link it, you choose: keep your reading and add new Strava kilometers on top, or switch to Strava's total. Strava tokens are stored encrypted with a key derived from `STRAVA_CLIENT_SECRET`; if you change the secret, connect Strava again.

## Running on a Raspberry Pi

Any Raspberry Pi with a **64-bit** operating system runs the same image; a Pi 4 or Pi 5 is comfortable.

1. Install Raspberry Pi OS (64-bit) or another 64-bit Linux.
2. Install Docker: `curl -fsSL https://get.docker.com | sh`.
3. Follow the [Quick start](#quick-start). Docker picks the arm64 image by itself.

SD cards wear out under a database's steady small writes. For an install you rely on, keep Docker's data on a USB SSD: set `"data-root"` in `/etc/docker/daemon.json` to a folder on the SSD before the first start. Either way, use the [backup](#updating-and-backups) command now and then.

## Running it on your own domain

To use BikePro away from home, put it behind a reverse proxy that handles HTTPS, and don't expose port 3000 directly. With [Caddy](https://caddyserver.com), which gets certificates by itself, the whole `Caddyfile` is:

```
bikes.example.com {
	reverse_proxy localhost:3000
}
```

Then set `APP_URL=https://bikes.example.com` in `.env`, restart, and use `bikes.example.com` as the Strava callback domain. nginx, Traefik or a Cloudflare Tunnel work the same way: terminate HTTPS and forward to port 3000.

## Install it as an app

BikePro can live on your phone's home screen, or in your computer's dock or start menu, and opens full screen without the browser's address bar.

- **iPhone and iPad:** open BikePro in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open it in Chrome, tap the **⋮** menu, then **Add to Home screen** or **Install app**.
- **Desktop:** in Chrome or Edge, use the install icon at the right of the address bar.

Android and desktop browsers only offer this over HTTPS, so set up [your own domain](#running-it-on-your-own-domain) first. On your own computer, `http://localhost:3000` works too. The app always shows the current version: there's nothing to update on the phone.

## Updating and backups

**Update** to the latest version. Database migrations run automatically on start:

```bash
docker compose pull
docker compose up -d
```

**Back up** the database while BikePro runs:

```bash
docker compose exec bikepro node -e "require('better-sqlite3')('/app/data/bikepro.db').backup('/app/data/backup.db').then(() => console.log('ok'))"
docker compose cp bikepro:/app/data/backup.db ./bikepro-backup.db
```

To restore, stop BikePro, copy the file back to `/app/data/bikepro.db` in the volume, and start it again.

Each user can also download their own data as JSON under **Settings → Your data**, and import such a file there, for example to move to another BikePro. An import adds the bikes as new bikes next to the ones you have. Link them to Strava again afterwards.

## Accounts and security

- The admin account comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Without them, the first person to open BikePro creates an account and becomes the admin, so set them before BikePro can be reached by others.
- Registration is closed once the first account exists. The admin opens and closes it under **Settings → Admin**, for example to let family members sign up.
- Change your password under **Settings → Account**. Your other devices are signed out.
- The admin can give someone a temporary password under **Settings → Admin**. Lost the admin password itself? Run this on the server for a temporary one, then change it in Settings:

  ```bash
  docker compose exec bikepro node scripts/reset-password.js admin@example.com
  ```

- Delete your account and all its data under **Settings → Danger zone**. The admin account can't be deleted.
- Passwords are hashed with scrypt. Sessions are stored in the database, so signing out (or **Sign out everywhere** in Settings) ends them immediately. Unused sessions expire after 30 days.
- After 10 failed sign-ins for an account, further attempts are refused for 15 minutes.
- Every page is sent with a strict Content Security Policy and other security headers. HSTS is added when `APP_URL` is `https://`.
- Found a security problem? Please report it privately, as described in [SECURITY.md](SECURITY.md).

## Roadmap

Ideas for what comes next: automatic backups, notifications when a part needs attention. Suggestions are welcome as [feature requests](https://github.com/HugooB/bikepro/issues/new/choose).

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the checks CI runs and how to change the database. [docs/architecture.md](docs/architecture.md) explains how BikePro works inside. Please report security problems privately, as described in [SECURITY.md](SECURITY.md), and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

**Built with** [Next.js](https://nextjs.org) 16 and React 19, [SQLite](https://sqlite.org) through [Drizzle ORM](https://orm.drizzle.team), [Tailwind CSS](https://tailwindcss.com) 4 and [Radix UI](https://www.radix-ui.com), with [zod](https://zod.dev) for validation and [Vitest](https://vitest.dev) for tests.

## License

[MIT](LICENSE) © Hugo Bijmans
