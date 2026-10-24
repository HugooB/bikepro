# Contributing to BikePro

Thanks for helping out! Bug reports, ideas and pull requests are all welcome. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security problems privately as described in [SECURITY.md](SECURITY.md).

## Before you start

- **Bugs:** open an [issue](https://github.com/HugooB/bikepro/issues/new/choose) with the steps to reproduce it.
- **New features or larger changes:** open an issue first, so we can agree on the approach before you put time into it. The [roadmap](README.md#roadmap) shows what's already planned.
- **Small fixes** (typos, small bugs): a pull request straight away is fine.

## Development setup

You need Node.js 24 (see [`.nvmrc`](.nvmrc); with nvm, run `nvm use`).

```bash
git clone https://github.com/HugooB/bikepro.git
cd bikepro
npm install
npm run dev           # http://localhost:3000
```

To try it on your phone, open the address `npm run dev` prints under "Network" (such as `http://192.168.1.20:3000`) while the phone is on the same network. `next.config.ts` allows private network addresses for this; other hosts need adding to `allowedDevOrigins`.

Local data lives in `data/bikepro.db`. Settings go in `.env.local` (copy [`.env.example`](.env.example)). None of them are needed to start.

`npm run db:seed` adds a sample race bike with every default part, and `npm run db:seed -- --reset` starts over. It refuses to run in production.

## Checks

CI runs these on every pull request, so run them before you push:

```bash
npm run lint
npm run typecheck
npm run format:check  # npm run format fixes it
npm test              # npm run test:coverage adds a coverage report in coverage/
npm run build
```

## Changing the database

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate`. This writes a new SQL migration to `drizzle/`. Commit it, and never edit a migration that's already on `main`.
3. Restart the dev server. Migrations run automatically on start, in development and in production.

`npm run db:studio` opens Drizzle Studio to browse the data.

## Code style

- **Formatting:** Prettier, including Tailwind class sorting. Don't format by hand: run `npm run format`.
- **Linting:** ESLint with Next.js's recommended rules (`eslint.config.mjs`).
- **TypeScript:** strict, with `noUncheckedIndexedAccess`. Avoid `any`, and use `!` only where the code just made sure the value exists.
- **Where code goes:** see [docs/architecture.md](docs/architecture.md#code-layout).
  - Logic without database access goes in `src/lib`, and database reads and writes go in `src/db`. Both should come with tests next to them (`*.test.ts`).
  - Pages and server actions stay thin: check the user, validate input with zod, and call into `src/lib` or `src/db`.
- **Access control:** every server action starts with `requireUser()` and loads records through the ownership checks in `src/db/access.ts`.
- **Text in the app:** short, plain English, written for riders rather than mechanics. All of it lives in `src/i18n/en.ts`, never in components: add a key there and use `t("your.key")` (`getT()` on the server, `useT()` in client components). Add the same key to every other language file; the type check tells you which ones.
- **Few dependencies:** prefer what the platform, Node or the existing libraries already offer, and explain in the PR why a new dependency is worth it.

## Adding a language

BikePro's translations are plain TypeScript files, one per language, with no translation platform or library.

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts`, using the two-letter language code (for example `de.ts`), and translate the text. Keep the keys, the `{placeholders}` and the `<tags>` exactly as they are; only the words around them change.
2. Type the file as `Dictionary` (see `nl.ts`) and add it to `dictionaries` and `localeNames` in `src/i18n/index.ts`. Add its date and number formats to `intlLocales` and `dateFnsLocales` in `src/lib/units.ts`.
3. Run `npm run typecheck`. It fails on every key that's missing or misspelled.
4. Check the screens at phone width: a longer translation can break a button or a row.

Plurals are objects such as `{ one: "{count} bike", other: "{count} bikes" }`. Use the forms your language needs (`zero`, `one`, `two`, `few`, `many`, `other`), as `Intl.PluralRules` names them. Sentences that include a part name are tricky in languages with grammatical gender or articles: it's fine to leave the name out, as the Dutch file does in a few places.

## Pull requests

- Keep each PR to one change. A PR that fixes a bug and refactors something else is harder to review.
- Describe what changed and why, and how you tested it. Add a screenshot for visible changes, at phone width and desktop width.
- Add or update tests for changes to `src/lib` and `src/db`.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- Write commit messages in the imperative, as the existing history does ("Add …", "Fix …").

By contributing, you agree that your contribution is licensed under the [MIT licence](LICENSE).
