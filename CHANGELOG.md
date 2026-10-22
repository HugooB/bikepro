# Changelog

All notable changes to BikePro are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and BikePro uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

The first public release, v0.1.0, will include everything below.

### Added

- Part tracking with service and replacement intervals per part, in km and days. Defaults come from published maintenance guides.
- An interactive bike drawing that colours each part by its condition.
- A history per part, service rounds covering many parts at once, and part replacement that keeps the old part's lifetime km, age and price.
- A Costs tab: total cost, cost per year of ownership, maintenance per 1,000 km, and charts per year and category.
- Optional Strava sync of each bike's odometer.
- A five-step add-bike wizard for road, gravel and TT bikes with disc or rim brakes.
- Multiple accounts, each with their own bikes, and a JSON export of your data.
- A Docker image with automatic database migrations and a health check.
- Documentation: architecture notes, contribution guide, security policy and code of conduct.

[Unreleased]: https://github.com/HugooB/bikepro/commits/main
