# BikePro: Race Bike Maintenance Tracker

## Context

Hugo keeps forgetting how old the parts on their race bike are (chain, tires, wheels and so on) and when maintenance was last done. The goal is a self-hosted web app that works on desktop and mobile. Its home screen shows a stylised race bike with every part listed underneath, each with its age and wear status. Tapping a part lets you log maintenance steps on it. A floating action button (FAB) in the bottom right logs a full service round.

**Decisions so far:** Next.js + SQLite, self-hosted with Docker · multiple users, each with multiple bikes · part age tracked as time plus km from Strava · colour status only (no notifications) · interactive SVG bike · light, minimal style · English only · cost tracking, installable PWA, and a history of retired parts · **a guided "Add bike" wizard (including Strava linking) whenever a bike is added; when it finishes, the new bike appears on the home screen.**

The project directory (`/Users/hugobijmans/Documents/git/bikepro`) is empty, so this is a greenfield build.

## Stack

- **Next.js 15** (App Router, Server Actions, TypeScript), **Tailwind CSS v4**, **shadcn/ui** primitives (Dialog, Sheet, Form)
- **SQLite** with **Drizzle ORM** and `better-sqlite3`; migrations via `drizzle-kit`
- **Auth.js v5**: email + password credentials (bcrypt) and database sessions. Strava is a linked OAuth account, not the login method.
- **zod** for validation, **date-fns** for ages
- **PWA**: `app/manifest.ts` + a small service worker (`@serwist/next`) for installability and offline app-shell caching
- **Docker**: multi-stage `Dockerfile` + `docker-compose.yml` with a volume holding `data/bikepro.db`

## Data model (`src/db/schema.ts`)

- `users`: id, email, name, passwordHash
- `strava_accounts`: userId, athleteId, accessToken, refreshToken, expiresAt, lastSyncAt
- `bikes`: id, userId, name, type, stravaGearId (nullable), odometerKm (manual or from Strava), photo/colour accent, createdAt
- `parts`: id, bikeId, category (drivetrain/wheels/brakes/contact), kind (`chain`, `tire_rear`, ...), name/brand/model, svgZone, installedAt, installedKm, intervalKm?, intervalDays?, cost?, status (`active` | `retired`), retiredAt?, retiredKm?, replacedByPartId?
- `part_events`: id, partId, date, odometerKm, type (`serviced` | `adjusted` | `cleaned` | `note` | `installed` | `replaced`), description ("New tire fitted"), cost?
- `service_rounds`: id, bikeId, date, shop, odometerKm, totalCost?, notes
- Each part a service round covers gets a `part_events` row with `serviceRoundId` set (action + note), so the round links its parts and each part's "last serviced" updates. (This replaced a separate `service_round_parts` table.)

**Derived values:** part age = now − installedAt. Part km = bike odometer − installedKm. Status takes the _last serviced_ or _installed_ point (whichever is later) for services that reset an interval; otherwise it uses installation. Status ratio = max(km / intervalKm, days / intervalDays): green below 0.75, orange from 0.75 to 1, red at 1 and above.

**"Replace part" flow:** retire the current part (store retiredAt and retiredKm), create a new active part of the same kind, and log an `installed` event. The old part shows under "History" with its lifetime km, age and cost.

## Default parts template (`src/lib/default-parts.ts`)

New race bikes get these parts, each with a sensible default interval that the user can edit:

- **Drivetrain:** chain (3000 km / 1y), cassette (9000 km), chainrings (20000 km), front derailleur, rear derailleur, bottom bracket (2y)
- **Wheels & tires:** front wheel, rear wheel (true/bearings yearly), front tire (5000 km / 2y), rear tire (3500 km / 2y), tubeless sealant (3–6 months)
- **Brakes & cables:** front/rear brake pads (2500 km), rotors, brake fluid (1y), shift cables & housing (1y)
- **Contact points:** bar tape (1y), saddle, pedals, cleats (6 months), headset (1y)

Users can also add custom parts.

## Strava integration (`src/lib/strava.ts`, `app/api/strava/*`)

- Per-user OAuth (`read,profile:read_all` scope) at `/api/strava/connect` and `/api/strava/callback`. Tokens are stored and refreshed when they expire.
- `GET /api/v3/athlete` returns `bikes[]` with `id` and total `distance` (in metres). A bike is mapped to a Strava gear id in the bike settings.
- Sync runs on dashboard load if the last sync is more than 6 hours old, and from a "Sync now" button. It updates `bikes.odometerKm`.
- Fallback: without Strava, the user edits the odometer manually.
- Env vars: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `AUTH_SECRET`, `APP_URL`

## Add-bike wizard (`/bikes/new`)

This is the only way to add a bike, for brand-new users and for adding a second or third bike alike. On phones it's a full-screen flow; on desktop it's a centred card. Every step has one clear question, big tap targets, a progress bar ("Step 2 of 5"), Back/Next buttons, and sensible defaults so that pressing **Next** repeatedly always produces a usable bike.

1. **Welcome / basics:** bike name ("My Canyon"), type as picture cards (Road · Gravel · TT · Other), plus optional brand, model and frame colour. The colour tints the bike drawing. The type picks the default parts template.
2. **Strava:** "Track kilometres automatically?"
   - Not connected: a **Connect with Strava** button (official button style). OAuth returns to `/bikes/new?step=strava`.
   - Connected: a list of the athlete's Strava bikes (name + total km). Tapping one links it and prefills the odometer.
   - **Skip, I'll enter km myself:** a numeric odometer field instead. Strava can still be linked later from Settings.
3. **When did you get it?** Purchase date (quick picks: "This month", "This year", "Pick a date"), and whether it was new or used. This sets the default install date and km for every part.
4. **Parts:** default parts grouped by category, all ticked by default. Untick parts the bike doesn't have (e.g. rotors on rim brakes). Each part has an optional "Replaced since purchase?" toggle that asks for a date or km, so a chain fitted last month is aged correctly from day one. An "Advanced" expander lets you edit the service intervals.
5. **Review & create:** a summary card showing the bike drawing in the chosen colour, the Strava link status, and the number of parts. Pressing **Add bike** runs one server action in a single DB transaction (bike + parts + `installed` events). A short success animation follows, then the app redirects to `/bikes/[newId]`. The new bike is selected in the header switcher and shown on the home screen.

**Technical notes:**

- Wizard state lives in a client store (`useReducer`), mirrored to `sessionStorage` (wrapped in try/catch) so it survives the Strava OAuth redirect and page refreshes. Each step is validated with a zod schema (`src/lib/wizard-schema.ts`). Nothing is written to the database until step 5.
- Components: `src/app/(app)/bikes/new/page.tsx`, `src/components/wizard/{Wizard,StepBasics,StepStrava,StepPurchase,StepParts,StepReview,ProgressBar}.tsx`, action `createBikeFromWizard` in `src/actions/bikes.ts`. Reuses `default-parts.ts` and `strava.ts`.
- Entry points: "Add your first bike" empty state on `/`, "+ Add bike" at the bottom of the bike switcher, and "+ Add bike" in Settings → Bikes. A new user with no bikes is sent straight into the wizard after registering.
- Accessibility: keyboard navigation (Enter = Next), focus moves to each step's heading, the step count is announced, and it works at a 390px width.

## Screens / routes

- `/login`, `/register`
- `/` redirects to the last-viewed bike, or to the add-bike wizard if the user has no bikes
- `/bikes/new`: the add-bike wizard (above)
- `/bikes/[bikeId]` is the **home screen**:
  - Bike switcher in the header (dropdown) plus odometer and Strava sync indicator
  - `<BikeSvg>`: line-art road bike in which each part is a `<g data-zone>` filled with its status colour. Tapping one scrolls to and highlights that part in the list below; hovering on desktop shows a tooltip.
  - Part list grouped by category. Each row shows the name, age ("1y 3m"), km since install, and a status dot or progress bar.
  - **FAB (bottom right)** labelled "+ Service round" opens a sheet with date, shop, odometer (prefilled), cost, notes, and a multi-select of parts with an optional action per part
- `/bikes/[bikeId]/parts/[partId]`: part detail with specs, age, km, interval editing, a timeline of events, an "Add maintenance step" form (type, description, date, km, cost), and a "Replace part" action. On mobile this opens as a bottom sheet over the home screen (Next.js intercepting route); on desktop it's a full page.
- `/bikes/[bikeId]/history`: service rounds and retired parts
- `/bikes/[bikeId]/costs`: totals per year and category, as a simple bar chart
- `/settings`: profile, Strava connect/disconnect, manage bikes (edit, archive, link to Strava gear; "+ Add bike" opens the wizard)

## Design

Light and minimal: white or off-white background, one accent colour, generous spacing, and a large rounded FAB. Mobile-first single-column layout. At ≥1024px the layout becomes two columns (bike drawing left and sticky, list right). Status colours are muted green, amber and red, with text labels so colour isn't the only signal. The `frontend-design` skill guides the final visual polish.

## File layout (key files)

```
src/
  app/(auth)/login, register
  app/(app)/bikes/[bikeId]/page.tsx, parts/[partId]/page.tsx, @modal/(.)parts/[partId]
  app/(app)/settings/page.tsx
  app/api/strava/{connect,callback,sync}/route.ts
  app/manifest.ts
  components/BikeSvg.tsx, PartList.tsx, PartRow.tsx, ServiceRoundSheet.tsx, Fab.tsx, StatusBadge.tsx
  db/schema.ts, db/index.ts
  lib/auth.ts, strava.ts, status.ts, age.ts, default-parts.ts
  actions/{bikes,parts,events,service-rounds}.ts   (server actions, scoped by userId)
Dockerfile, docker-compose.yml, drizzle.config.ts
```

## Milestones

Each milestone leaves the app working and usable, so the build can stop after any one of them and resume later. Build them in order, finish the "Done when" checks, then commit (`git tag m1`, `m2`, ...).

### M0: Project foundation

- `git init`, scaffold Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui, ESLint/Prettier, Vitest
- Drizzle + better-sqlite3 setup (`src/db/index.ts`, `drizzle.config.ts`), first empty migration
- `Dockerfile` + `docker-compose.yml` with a volume for `data/`
- Base layout: app shell, light theme tokens, placeholder home page
- **Done when:** `npm run dev`, `npm run test` and `docker compose up --build` all work and show the placeholder page

### M1: Single bike, list of parts (local MVP, no auth yet)

- Schema: `bikes`, `parts`, `part_events` (`userId` columns already present, nullable for now)
- `default-parts.ts` template and a seed script that creates one "Race bike" with all default parts
- Home screen `/bikes/[bikeId]`: part list grouped by category, with each part's age ("1y 3m") from `age.ts`
- Manual odometer field on the bike, and km since install per part
- **Done when:** the seeded bike shows every part with its correct age; `age.ts` has unit tests

### M2: Logging maintenance on a part

- Part detail page: specs, events timeline, "Add maintenance step" form (type, description, date, km, cost)
- Edit part details and interval (km/days)
- `status.ts` (green/orange/red) with unit tests, plus status dots or bars in the list
- **Done when:** logging "Chain cleaned" appears in the timeline and the status updates. _The first version you can actually use day to day._

### M3: Service rounds (FAB)

- Schema: `service_rounds`, plus `part_events.serviceRoundId` linking each covered part
- Floating "+ Service round" button and sheet: date, shop, odometer, cost, notes, multi-select of parts with an optional action note per part
- Saving creates one `part_events` row per selected part
- **Done when:** a service round covering 3 parts shows up in each part's timeline and resets their status where relevant

### M4: Replace and retire parts, plus history

- "Replace part" flow: retire the old part (retiredAt, retiredKm), create a new one, log an `installed` event
- `/bikes/[bikeId]/history`: service rounds list and retired parts with lifetime km, age and cost
- Add and remove custom parts
- **Done when:** replacing the rear tire shows a fresh tire on the home screen and the old one under History

### M5: Interactive bike illustration

- `BikeSvg.tsx`: minimal line-art road bike, with each part as a `<g data-zone>` coloured by status
- Tapping a zone highlights and scrolls to the part in the list (and back the other way); desktop tooltip
- Responsive layout: one column on mobile, two columns (sticky bike + list) at ≥1024px; visual polish via the `frontend-design` skill
- **Done when:** the home screen looks finished on a 390px phone and on desktop, and every zone links to its part

### M6: Add-bike wizard and multiple bikes

- Wizard at `/bikes/new` with steps 1, 3, 4 and 5 (basics, purchase, parts, review). In this milestone the Strava step shows only the **manual odometer** option, behind a `stravaEnabled` flag.
- `createBikeFromWizard` server action (one transaction), plus a success animation and redirect to the new bike's home screen
- Bike switcher in the header with "+ Add bike"; edit/archive bikes in `/settings`; empty state "Add your first bike" on `/`
- The M1 seed script becomes dev-only, since real bikes now come from the wizard
- **Done when:** adding a Gravel bike with a few parts unticked and a "chain replaced last month" toggle, using only Next/Back, lands on its home screen with exactly those parts and correct ages, and both bikes appear in the switcher

### M7: Users and accounts

- Auth.js v5 credentials (register/login, bcrypt, database sessions), middleware protecting `(app)` routes
- Every query and server action scoped by `userId`; existing data migrated to the first user
- After registering, a new user with no bikes goes straight into the add-bike wizard
- **Done when:** two accounts each see only their own bikes, and a freshly registered account is guided through the wizard to its first bike's home screen

### M8: Strava km sync (in the wizard and in settings)

- Strava OAuth connect/disconnect, token storage and refresh (`strava.ts`); OAuth `state` carries a `returnTo` so the wizard resumes at its Strava step
- Turn on the wizard's Strava step: connect button, pick a Strava bike (name + km), odometer prefilled; "Skip" keeps the manual path
- Link or unlink Strava gear for existing bikes in Settings; sync `odometerKm` from `/athlete` on load (if stale for more than 6 hours) and from "Sync now"; the header shows when the last sync ran
- **Done when:** in the wizard, connecting Strava, coming back to the same step with the draft intact, and picking a bike gives a new bike whose odometer matches Strava; part km then update automatically after rides

### M9: Costs

- Cost fields already exist; add `/bikes/[bikeId]/costs` with totals per year and category (simple bar chart, using the `dataviz` skill) and a per-bike lifetime total
- **Done when:** the totals equal the sum of part, event and service round costs

### M10: Installable PWA and deployment polish

- `app/manifest.ts`, icons, a Serwist service worker (offline app shell)
- Loading and empty states, error boundaries, a pass over mobile ergonomics
- JSON export of a user's data as a backup; deployment notes in README (reverse proxy + HTTPS, needed for PWA and Strava callback)
- **Done when:** Lighthouse reports the app as installable, it installs on iOS and Android home screens, and it survives `docker compose` restarts with data intact

## Verification

- `npm run test` (Vitest): unit tests for `status.ts` thresholds, `age.ts` formatting, and the replace-part logic
- Unit tests for the wizard's zod step schemas and for `createBikeFromWizard` (parts unticked or replaced map to correct rows and install dates)
- `npm run dev`. Then walk through: register → wizard starts automatically → complete it (once with Strava, once skipping) → the new bike shows on the home screen and in the switcher → its parts appear → log "chain replaced" → age resets → add a service round covering 3 parts → each part's timeline shows the entry → retire a tire → it appears in History
- Drive the app in a browser with Claude in Chrome at mobile (390px) and desktop widths, and check that SVG zones highlight the matching parts
- Strava: connect with a test account and confirm the bike's odometer matches the Strava gear distance
- `docker compose up --build`: app on port 3000, and data survives a container restart
- Lighthouse PWA check: the app is installable
