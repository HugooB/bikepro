# Architecture

How BikePro works under the hood: the stack, the data model, and the rules behind part status, replacements, service rounds, costs and Strava. For setting up a development environment, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

- **[Next.js](https://nextjs.org) 16** (App Router, Server Components, Server Actions) with React 19 and TypeScript. It's built as a `standalone` server for the Docker image.
- **SQLite** through [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and [Drizzle ORM](https://orm.drizzle.team). It's one file, in WAL mode with foreign keys on, and migrations run automatically when the server starts (`src/instrumentation.ts`).
- **[Tailwind CSS](https://tailwindcss.com) 4** with a few [shadcn/ui](https://ui.shadcn.com) components on top of [Radix UI](https://www.radix-ui.com) (`src/components/ui/`).
- **[zod](https://zod.dev)** to validate every form and server action, **[date-fns](https://date-fns.org)** for date arithmetic, and **[Vitest](https://vitest.dev)** for tests.
- **No auth library.** Accounts, sessions and password hashing are a small amount of code built on Node's `crypto` (see [Accounts and sessions](#accounts-and-sessions)).

## Code layout

```
src/
  app/            routes: pages, loading/error states, and API routes under app/api/
  actions/        server actions, one file per area (account, admin, auth, bikes, parts, …)
  components/     React components; ui/ holds the shadcn primitives
  db/             schema, connection, migrations runner, queries and write operations
  lib/            logic with no database access: status, ages, units, costs, default parts, wizard rules
  lib/auth/       passwords, sessions, sign-in throttling, safe redirects
  lib/strava/     Strava API client, sync, token encryption, OAuth state
  i18n/           the dictionary per language (en.ts is the source), t(), and how to get it
  proxy.ts        sends signed-out visitors to /login and sets the Content Security Policy
  instrumentation.ts  runs the migrations and creates the admin account on start
drizzle/          generated SQL migrations (never edit by hand)
scripts/          plain Node scripts that also run inside the Docker image (reset-password.js)
```

Most logic lives in `src/lib` (no database access) and in `src/db` (queries and writes). Both are tested with Vitest. Pages and server actions are thin: they check the user, validate input with zod, and call into those two folders.

## Data model

The schema is defined in `src/db/schema.ts`. Calendar dates (purchase, installation, events) are stored as `"YYYY-MM-DD"` text. Timestamps are Unix seconds.

| Table                | Holds                                                                                                                                           | Notes                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `users`              | email (lowercased), name, scrypt password hash, `isAdmin`, `distanceUnit` (`km` / `mi`), `currency` (ISO 4217)                                  | The unit and currency only change how values are shown and entered                                                       |
| `sessions`           | SHA-256 of the session token, user, expiry                                                                                                      | The token itself is only in the user's cookie                                                                            |
| `app_settings`       | install-wide settings as key/value pairs, such as `registrationOpen`                                                                            | Changed by an admin in Settings → Admin (`src/db/app-settings.ts`)                                                       |
| `bikes`              | name, type (`road` / `gravel` / `tt` / `mtb` / `city` / `other`), brake type, tire type, brand, model, color, purchase date and price, odometer | Strava link: `stravaGearId` (unique), `stravaDistanceKm`, `stravaOffsetKm`                                               |
| `parts`              | category, `kind` (e.g. `chain`), name, drawing zone, installation date and km, service and replacement intervals (km and/or days), price        | `status` is `active` or `retired`. Retired parts keep `retiredAt`, `retiredKm` and `replacedByPartId`                    |
| `part_events`        | what happened to a part: `installed`, `serviced`, `cleaned`, `adjusted`, `replaced` or `note`, with date, km, description and cost              | `resetsInterval` marks events that restart the service interval. `serviceRoundId` links events logged by a service round |
| `service_rounds`     | a shop visit covering many parts: date, shop, odometer, total cost, notes                                                                       | Its parts are the `part_events` that point to it                                                                         |
| `strava_connections` | one per user: athlete, encrypted tokens, cached Strava bikes, sync status                                                                       | A Strava account connects to one BikePro account only                                                                    |

Deleting a bike deletes its parts, events and service rounds (`ON DELETE CASCADE`). Deleting a service round deletes the events it logged.

## Units and currency

Every distance in the database is in km, and every amount is a plain number. Each user picks `km` or `mi` and a currency in Settings → Preferences. `src/lib/units.ts` holds the conversion and formatting, including dates and numbers in the user's language: server components call `getUnits()` (`src/i18n/server.ts`), and client components call `useUnits()`, which reads the preferences the root layout passes to `PrefsProvider` (`src/i18n/client.tsx`). Nothing formats a distance or an amount any other way.

- **Display:** whole numbers in the user's unit, and amounts with `Intl.NumberFormat` in their currency. Euro amounts look exactly as they did before currencies existed (`€1,234.50`).
- **Forms:** fields show `toInput(km)`, and server actions turn what comes back into km with `inputToKm()` or `intervalToKm()`. When a field still shows the value it was filled with, the stored value is kept as it is. A rounded display value never overwrites a precise one (8412.37 km shows as 5,227 mi), so saving a form unchanged changes nothing.
- **Wizard:** a draft records the unit its numbers are in, and `planBike()` converts them to km. Default intervals are shown rounded the way a person would write them (3000 km becomes 1,850 mi). A saved draft in the other unit is discarded rather than shown with the wrong label.
- **Amounts** are never converted between currencies. Switching currency relabels the same numbers.

## Installable app

`src/app/manifest.ts` is served as `/manifest.webmanifest` and makes BikePro installable: standalone display, start URL `/`, and icons in `public/` (192 and 512 px with rounded corners, plus a full-bleed 512 px `maskable` one whose bike stays inside the 80% safe zone). They're rendered from `docs/logo/app-icon.svg`. iOS ignores most of the manifest, so the root layout's metadata adds the `apple-mobile-web-app-*` tags, and `src/app/apple-icon.png` is its home-screen icon. The proxy's matcher skips `.webmanifest` and image files, so the manifest and icons load without a session. Its text stays English: browsers fetch it without the user's cookies.

There's no service worker: BikePro needs the server for everything it shows, so there's nothing useful to do offline yet.

## Languages

The interface text lives in one dictionary per language in `src/i18n`, without a library. `en.ts` is the source of truth, and every other language is typed as its `Dictionary`, so a missing key fails the type check. `t(key, vars)` fills in `{placeholders}` and picks plural forms with `Intl.PluralRules`. Keys are typed, so a misspelled key is a type error too. A key missing at runtime falls back to English.

- **Which language:** `users.locale`, picked in Settings → Preferences. Visitors who aren't signed in get the best match for their browser's `Accept-Language` header, and a new account starts in that language. Accounts from before languages existed stay English.
- **Server and client:** server components, server actions and route handlers call `getT()` from `src/i18n/server.ts`. Client components call `useT()` from `src/i18n/client.tsx`. Both dictionaries are part of the client bundle, so only the preferences cross from the server.
- **Rich text:** `rich()` (`src/i18n/rich.tsx`) turns tags in a translation, such as `<b>…</b>` or `<link>…</link>`, into elements. Links and emphasis stay in the components, and word order stays in the translation.
- **Validation and errors:** zod schemas are functions of `t`, so their messages are translated. Errors thrown below the actions are `UserError`s that carry a dictionary key, and the action translates them for the user.
- **Stored text:** parts keep the name they were created with, and template parts store the English template name. `partName()` shows a template name in the user's language while it's unchanged; a name the user typed is shown as typed. The edit form turns an unchanged translated name back into the template name before saving. The history entries BikePro writes itself ("Came with the bike") are stored in the language of the user who created them.
- **Dates and numbers:** `Intl.NumberFormat` and date-fns use the user's language through `src/lib/units.ts`. English keeps `en-IE` for numbers and amounts, so they look as before.

## Part status

`computeStatus()` in `src/lib/status.ts` works out each part's condition from two independent intervals. Each interval is in km, days or both, and whichever comes first counts.

- **Service interval:** how often the part needs servicing (cleaning, lubing, a bleed). It's counted from the latest event with `resetsInterval` (by default `serviced` and `replaced`, see `src/lib/event-types.ts`), or from installation.
- **Replacement interval:** the part's maximum life, counted from installation.

For each interval, the _ratio_ is how much of it has been used, taking whichever of km and days is furthest along. Then:

| Ratio      | Level     | Shown as                                |
| ---------- | --------- | --------------------------------------- |
| < 0.5      | `ok`      | Good condition (green)                  |
| 0.5 – 0.75 | `ok`      | Fair condition (green)                  |
| 0.75 – 1   | `due`     | Service soon / Replace soon (orange)    |
| ≥ 1        | `overdue` | Needs a service / Needs replacing (red) |

The more urgent of the two intervals decides the part's level. On a tie, replacing wins over servicing. A part with no intervals shows "No intervals set".

The bike drawing (`src/components/bike/BikeDrawing.tsx`) has a zone for each area, such as the chain, rear tire or headset (`src/lib/zones.ts`). Each part names its zone, and a zone takes the color of its most urgent part.

Default parts and intervals per bike type, brake type and tire type are in `src/lib/default-parts.ts`. The sources for the intervals are cited at the top of that file.

## Replacing a part

`replacePart()` in `src/db/part-events.ts` never edits the old part in place:

1. It inserts a fresh active part of the same kind, with the same name, zone, intervals and position in the list, installed on the replacement date and km.
2. It retires the old part, setting its `retiredAt`, `retiredKm` and `replacedByPartId`.
3. It logs a `replaced` event on the old part and an `installed` event on the new one.

The old part, with its whole history, lifetime km, age and price, appears under **History → Retired parts**. The new part's price is stored on the new part, so costs never count a part twice.

## Service rounds

A service round (`createServiceRound()` in `src/db/service-rounds.ts`) is one shop visit or home service session. It's saved in a single transaction:

- one `service_rounds` row, which carries the date, shop, km and the **total cost**
- one `part_events` row per covered part, with `serviceRoundId` set and no cost of its own, so the money is counted once
- covered parts with the action "replaced" go through the replace flow above
- the bike's odometer moves forward if the round's km is higher (`bumpOdometer()`, which never goes backwards)

## Costs

`src/lib/costs.ts` gathers spending from four places. Each euro is recorded in exactly one of them:

1. the bike's purchase price
2. a part's price, dated when the part was installed
3. the cost of a maintenance step
4. a service round's total

Everything except the purchase counts as maintenance. The Costs tab shows totals per year and per category, cost per year of ownership, and maintenance per 1,000 km.

## Accounts and sessions

- **Passwords:** hashed with scrypt from Node's `crypto`, with N=2¹⁷, r=8, p=1 (`src/lib/auth/password.ts`). The parameters are stored with each hash, so they can be raised later.
- **Sessions:** a random token goes in an httpOnly, SameSite=Lax cookie (`bikepro_session`). The cookie is marked Secure when `APP_URL` is https. The database stores only the token's SHA-256 hash. A session expires after 30 days without use and is extended once less than half its time is left (`src/db/sessions.ts`). Signing out deletes the session row, so it ends immediately.
- **Access control:** there are two layers.
  - `src/proxy.ts` sends visitors without a session cookie to `/login`. It only checks that the cookie exists.
  - Every page and server action calls `requireUser()` (`src/lib/auth/session.ts`), which validates the session. Then it loads records through the ownership checks in `src/db/access.ts`. Those return nothing for records that don't exist or belong to someone else.
- **Admin and registration:** on start, `bootstrapAccounts()` (`src/lib/auth/bootstrap.ts`) creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or makes an existing account with that email an admin. It refuses to start when `ADMIN_EMAIL` is set without a usable password. Without `ADMIN_EMAIL`, the first account to register becomes the admin.
  - Once any account exists, registration is closed until an admin opens it in Settings → Admin (`registrationOpen` in `app_settings`, see `src/db/users.ts`).
  - The first account also takes over any bikes created before accounts existed.
- **Changing and resetting passwords:** changing your own password needs the current one, and wrong guesses count towards the sign-in throttle. Afterwards every other session of that user is deleted; the current one stays. An admin can reset someone else's password in Settings → Admin (`resetPassword()` in `src/db/users.ts`): it sets a random temporary password, shows it once and deletes all of that user's sessions. `scripts/reset-password.js` does the same from the command line, which is the only way back into a locked-out admin account. It's plain JavaScript so it runs in the Docker image without a build; it writes the same hash format as `password.ts`, and a test checks the two agree.
- **Deleting an account:** needs the password and is refused for admins, so an install always keeps one. It revokes BikePro's Strava access on a best-effort basis, then deletes the user's bikes (which have no foreign key to their owner) and the user in one transaction. Parts, events, service rounds, sessions and the Strava connection go with them through `ON DELETE CASCADE`.
- **Security headers:** `src/proxy.ts` sends a Content Security Policy with a fresh nonce per request, which Next.js adds to its own scripts. No inline script without that nonce can run, and nothing is loaded from other domains. It also adds HSTS when `APP_URL` is https. `next.config.ts` adds `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` to every response.
- **Throttling:** after 10 failed sign-ins for one email within 15 minutes, further attempts are refused (`src/lib/auth/throttle.ts`). The counter is kept in memory, which suits a single self-hosted server.

## Strava

The code is in `src/lib/strava/` (the API client, sync and crypto), `src/db/strava.ts` and the routes `app/api/strava/connect` and `app/api/strava/callback`.

- **Connecting:** standard OAuth with the `read,profile:read_all` scope. A random `state` value is kept in a short-lived httpOnly cookie and checked on the callback (`src/lib/strava/oauth-state.ts`), so a forged callback link can't connect the wrong Strava account. The same cookie remembers where to return to, so the add-bike wizard can resume after the redirect.
- **Tokens:** stored encrypted with AES-256-GCM. The key is derived from `STRAVA_CLIENT_SECRET`, which lives in `.env`, not in the database, so a copy of the database file alone can't act for the user. Changing the secret makes stored tokens unreadable, and users then reconnect. Tokens are refreshed when they have less than 5 minutes left.
- **What's read:** only `GET /athlete`, which lists the athlete's bikes with their total distance. Rides are never read.
- **Odometer:** while a bike is linked, `odometerKm = Strava total + stravaOffsetKm`.
  - When the user links a bike whose odometer differs from Strava's total, they choose: keep their reading (the offset absorbs the difference) or switch to Strava's total (offset 0).
  - Editing the odometer by hand moves the offset, so later syncs add on top of the new reading.
- **When it syncs:** opening the app starts a background sync (`StravaAutoSync`) when the last attempt is more than an hour old. **Sync now** in Settings syncs straight away, at most once every 10 seconds. A failed sync is stored on the connection: `revoked` asks the user to reconnect, `failed` is retried later. There are no webhooks.

## Add-bike wizard

`/bikes/new` is the only way to add a bike. It has five steps (`src/lib/wizard-schema.ts`):

1. **Basics:** name, type, brake type, tire type (tubeless or inner tubes), brand, model, color.
2. **Odometer:** link a Strava bike, or enter the km by hand.
3. **Purchase:** date, new or used, price.
4. **Parts:** the default parts for the bike's type, brakes and tires: tubeless sealant only for tubeless tires. Parts can be unticked, marked as "replaced since purchase" with a date and km, and their intervals changed.
5. **Review.**

The draft is kept in a reducer and mirrored to `sessionStorage`, so it survives a refresh and the Strava OAuth redirect. Each step is validated with zod. Nothing is written until the final step: `planBike()` turns the draft into rows, and `createBike()` (`src/db/bikes.ts`) inserts the bike, its parts and their `installed` events in one transaction. A part replaced since purchase but given no km gets an estimate from the average riding per day since purchase.

## Data export

`GET /api/export` (`src/db/export.ts`) downloads all of a user's data as JSON: bikes, parts, events, service rounds and the Strava athlete name. The file has a format `version` (currently `1`). Distances are always in km (`distanceUnit: "km"`), and `currency` says what the amounts are in, whatever the user's display settings. It leaves out passwords, sessions and Strava tokens.

Settings → Your data imports such a file (`src/db/import.ts`). A zod schema that mirrors the export checks it first, and a file from a newer format version is refused. The bikes are then added to the signed-in account as new rows in one transaction, so a bad file writes nothing. Every id is new, and the links between records (events to parts and service rounds, a retired part to the part that replaced it) are remapped. Strava links are left out, because the Strava bikes belong to the old install's connection; odometer readings are kept. Server actions accept bodies up to 6 MB (`next.config.ts`) to leave room for a 5 MB import.

## Docker image

The `Dockerfile` builds the `standalone` server in three stages (dependencies, build, a slim runner as a non-root user) and copies in `drizzle/` for the migrations and `scripts/` for the command-line tools. Data lives in `/app/data`.

Release tags publish it through `.github/workflows/docker.yml`: amd64 and arm64 build on native GitHub runners, each image must start and answer `/api/health` before it's pushed by digest, and a final job tags both architectures together on `ghcr.io/hugoob/bikepro` with provenance and SBOM attestations. The actions are pinned to commit SHAs; Dependabot updates them.

`next build` imports every route in parallel workers, so `src/db/index.ts` gives the build an in-memory database instead of a file (`NEXT_PHASE`). Workers opening the same file at once could fail with "database is locked".
