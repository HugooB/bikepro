# Changelog

All notable changes to BikePro are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and BikePro uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/HugooB/bikepro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/HugooB/bikepro/releases/tag/v0.1.0
