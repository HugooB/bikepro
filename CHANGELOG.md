# Changelog

All notable changes to BikePro are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and BikePro uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Tubeless tires or inner tubes per bike, in the add-bike wizard and in Settings. The wizard suggests tubeless sealant only for tubeless tires. Existing bikes get tubeless when they have sealant, otherwise inner tubes. Imports of older exports follow the same rule.

## [0.6.0] - 2026-10-24

A ready-made Docker image: install BikePro on a regular computer or a Raspberry Pi from two downloaded files.

### Added

- A ready-made Docker image for amd64 and arm64, so BikePro runs on regular computers, Apple Silicon Macs and the Raspberry Pi without cloning or building: `ghcr.io/hugoob/bikepro`. Every release publishes it as `x.y.z`, `x.y` and `latest`.
- A "Running on a Raspberry Pi" section in the README.

### Changed

- `docker-compose.yml` runs the published image. Updating is now `docker compose pull && docker compose up -d`. Building from source moved to `docker-compose.build.yml`.

### Fixed

- `npm run build` no longer opens the database, so it can't fail with "database is locked" when Next.js collects page data in parallel, and it leaves your local database alone.

### Upgrading

- Running from a clone: `git pull`, then `docker compose pull && docker compose up -d`. The compose project and its data volume stay the same, so your data carries over.

## [0.5.0] - 2026-10-24

Install BikePro as an app on your phone or computer.

### Added

- Install BikePro as an app: on a phone's home screen, or from Chrome or Edge on a computer. It opens full screen with its own icon. Android and desktop browsers need HTTPS for this; see "Install it as an app" in the README.

### Changed

- The English text uses American spelling throughout: "tires", "color" and "kilometers". It used to mix British and American.
- The README lists what BikePro can do today, including units, currencies, languages, accounts and import.

### Fixed

- Opening the service round sheet on a phone no longer pops up the date picker straight away.
- The Strava card in Settings shows the connected athlete's name on its own line, and its buttons move below it on phones instead of squeezing the text.

## [0.4.0] - 2026-10-24

Dutch: every screen in English or Dutch, picked per user, and a setup that makes adding a language a matter of translating one file.

### Added

- Dutch. Each user picks a language under **Settings → Preferences**, and every screen follows it, including dates, numbers, error messages and the names of the standard parts. Before signing in, BikePro uses the browser's language, and a new account starts in it.
- Contributors can add a language by translating one file: see "Adding a language" in CONTRIBUTING.md.

### Fixed

- On phones, a date field no longer overlaps the field next to it, and on the narrowest screens the two stack.
- `npm run dev` works when opened from a phone on the same network; before, buttons that need JavaScript did nothing there.

### Upgrading

- A database migration adds the language preference; it runs on start. Existing accounts stay in English.

## [0.3.0] - 2026-10-23

Miles and other currencies: every user picks how distances and amounts are shown, and nothing changes for existing users.

### Added

- Miles and other currencies, per user, under **Settings → Preferences**. Every screen follows the choice: odometers, part wear and status, intervals, history, costs ("per 1,000 mi") and charts, the add-bike wizard and Strava settings. Forms take values in your unit.
- Default intervals are shown in miles rounded the way you'd write them (3000 km becomes 1,850 mi).
- The JSON export now says what it's in: `distanceUnit` (always `km`) and `currency`.

### Changed

- Saving a form without changing a distance keeps the stored value exactly. Before, an odometer of 8412.4 km from Strava became 8412 km when a form was saved.

### Upgrading

- A database migration adds the two preferences; it runs on start. Existing accounts get kilometres and euros, so nothing changes until you pick something else.

## [0.2.0] - 2026-10-23

Account management: you can now manage your own account in full and move your data between installs.

### Added

- Change your password under **Settings → Account**. Your other devices are signed out; this one stays signed in.
- The admin can reset another user's password under **Settings → Admin**, which now lists every account. The temporary password is shown once, and the user is signed out everywhere.
- `scripts/reset-password.js` resets a password from the command line, the way back into a locked-out admin account: `docker compose exec bikepro node scripts/reset-password.js <email>`.
- Delete your account and all its data under **Settings → Danger zone**, after confirming your password. BikePro's access to Strava is revoked as well. The admin account can't be deleted.
- Import a JSON export under **Settings → Your data**, for example to move to another BikePro. The bikes are added as new bikes with all their parts, history and service rounds; Strava links are left out.

## [0.1.0] - 2026-10-22

The first public release.

### Added

- Part tracking with service and replacement intervals per part, in km and days. Defaults come from published maintenance guides.
- An interactive bike drawing that colours each part by its condition.
- A history per part, service rounds covering many parts at once, and part replacement that keeps the old part's lifetime km, age and price.
- A Costs tab: total cost, cost per year of ownership, maintenance per 1,000 km, and charts per year and category.
- Optional Strava sync of each bike's odometer.
- A five-step add-bike wizard for road, gravel and TT bikes with disc or rim brakes.
- Multiple accounts, each with their own bikes, and a JSON export of your data.
- An admin account created on start from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, so nobody else can claim a fresh install. The admin opens and closes registration under **Settings → Admin**.
- A strict Content Security Policy and other security headers on every response, plus HSTS when `APP_URL` is `https://`.
- A Docker image with automatic database migrations and a health check.
- Documentation: architecture notes, contribution guide, security policy and code of conduct.

### Upgrading from a pre-release build

- `ALLOW_REGISTRATION` is no longer used. Its value is carried over once as the registration setting, and from then on the admin opens and closes registration in the app. You can remove it from `.env`.
- The first account on an existing install becomes the admin.

[Unreleased]: https://github.com/HugooB/bikepro/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/HugooB/bikepro/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/HugooB/bikepro/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/HugooB/bikepro/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/HugooB/bikepro/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/HugooB/bikepro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/HugooB/bikepro/releases/tag/v0.1.0
