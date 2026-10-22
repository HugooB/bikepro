# Security policy

## Supported versions

BikePro is maintained by one person, so only the latest release gets security fixes. Please update to it before reporting (see [Updating and backups](README.md#updating-and-backups)).

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through GitHub instead:

1. Go to the repository's [Security tab](https://github.com/HugooB/bikepro/security) and choose **Report a vulnerability**. Or open the [private reporting form](https://github.com/HugooB/bikepro/security/advisories/new) directly.
2. Describe what you found, how to reproduce it, and what an attacker could do with it. Include the BikePro version or commit and how you run it (Docker or `npm start`, behind which reverse proxy).

Only the maintainer can see the report. You can expect:

- a first reply within a week
- a fix or a plan within 30 days for confirmed problems, sooner for serious ones
- credit in the release notes and the security advisory, unless you'd rather stay anonymous

## In scope

The BikePro code in this repository, for example:

- signing in, sessions and registration
- one user seeing or changing another user's data
- the Strava connection and how its tokens are stored
- the Docker image as built from this repository's `Dockerfile`

Problems in a dependency (Next.js, React, SQLite and so on) are best reported to that project. Do tell us too if BikePro is affected.

## Out of scope

- Installs that don't follow the README's advice: exposing port 3000 directly to the internet without HTTPS, or leaving registration open.
- Attacks that need access to the server, the `.env` file or the database file.
- Rate limiting and denial of service against a self-hosted install.

## How BikePro protects your data

For the details (password hashing, sessions, access checks and Strava token encryption), see [Accounts and sessions](docs/architecture.md#accounts-and-sessions) and [Strava](docs/architecture.md#strava) in the architecture notes.
