# Coloc4

Mobile-first web app for shared housing: who paid what, who does what, what is missing, what is happening at home.

- Design and decisions: [docs/phase-0-design.md](docs/phase-0-design.md)
- Current milestone: **M1 — Money works**

## Prerequisites

- Node.js 24+ (`.nvmrc`)
- Docker (for the local Supabase stack)

## Setup

```bash
npm ci
npm run db:start                 # local Supabase (ports 544xx, see supabase/config.toml)
cp .env.example .env.local       # then paste API URL + publishable key from `npx supabase status`
npm run dev
```

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are used by the app.
Never put an `sb_secret_…` key in the app or in a `NEXT_PUBLIC_*` variable.

## Scripts

| Script | Purpose |
|---|---|
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run lint` | ESLint (incl. bigint-only rules for `src/modules/*/domain`) |
| `npm test` | Vitest unit / property tests |
| `npm run db:test` | pgTAP database tests (`supabase test db`) |
| `npm run test:integration` | Concurrency tests against local Postgres (needs `db:start`) |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run test:e2e` | Build + Playwright (mobile viewport) |
| `npm run db:reset` | Recreate the local database from migrations |

## Layout

```text
src/app/            routes (App Router); (app)/ = authenticated area
src/lib/supabase/   user-scoped Supabase clients (server, browser, proxy session refresh)
src/i18n/fr.ts      user-facing French strings
src/proxy.ts        session refresh on every request
supabase/           config, migrations, pgTAP tests
e2e/                Playwright tests
```
