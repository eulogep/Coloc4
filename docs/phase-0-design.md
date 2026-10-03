# Coloc4 — Phase 0 Design

| Field | Value |
|---|---|
| Phase | 0 — Research + Architecture |
| Prompt version | Master Prompt v2.1.1 |
| Date | 2026-10-03 |
| Status | **AWAITING HUMAN REVIEW** |
| Application code written | None |
| Repository bootstrapped | No |
| Tests executed | None. Every test in this document is `NOT_RUN`. |

---

## 0. Document status and structural assumption

The master prompt that was received was **truncated** partway through §25 ("Phase 0 Deliverable"), just after `## 1. Pr`. Because of that, the mandatory section list for this document is unknown. The human then explicitly delegated the decision ("je te laisse décider, tu es autonome").

```text
ASSUMPTION A-00
The section structure below is chosen by the engineer and covers every Phase 0
artefact the prompt references elsewhere: product research (§19), resource
evaluation (§19.1), three architectures (§12.3), ADR-001..011 (§21),
five spikes (§20), M1 data model (§9), RLS (§11), RPC specs (§6, §7, §4.15),
test plan (§14), backlog (§23), and prompt conflicts (§1.2).
→ OPEN DECISION OD-00: if the original §25 lists different sections,
  this document will be restructured, not rewritten.
```

All SQL and TypeScript in this document is a **draft**. None of it has been compiled or executed.

---

## 1. Product research

### 1.1 Competitors consulted

| Product | What it does well | Friction / gap relevant to Coloc4 | Source (checked 2026-10-03) |
|---|---|---|---|
| **Splitwise** | Mature expense splitting, "simplify debts", multi-platform | The free tier has a **daily expense limit**: the official KB says "up to 4 expenses each day". Third-party reviews cite 3 or 4. Money only: no chores or shopping. | https://feedback.splitwise.com/knowledgebase/articles/2010350-why-am-i-seeing-an-expense-limit , https://www.kittysplit.com/en/splitwise-alternative |
| **Tricount** (bunq) | Simple group balances, "most efficient way to repay". Premium removed. | Increasingly tied to bunq banking (card payments become expenses). Money only. | https://tricount.com/en/what-happened-with-premium , https://help.tricount.com/articles/add-bunq-payments-as-expenses |
| **Flatastic** | **Closest competitor.** Flatshare app combining chores, shopping list, expenses, chat, calendar and pin board. | Already covers the "all-in-one household" bundle. Feature details come from marketing and third-party pages (not hands-on). | https://flatastic-app.com/ , https://alternativeto.net/software/flatastic/about |
| **Spliit** (OSS) | Free Splitwise alternative, no account required | Money only | https://github.com/spliit-app/spliit |
| **SplitPro** (OSS) | Self-hosted Splitwise alternative, multiple split methods | Money only, friends/groups model | https://github.com/oss-apps/split-pro |

`UNVERIFIED` (not consulted this session): OurHome, Tody, Sweepy, Listonic, Bring!, Google Keep shared lists. These should be checked before V1 chores/shopping design, not before M1.

### 1.2 Product conclusions

1. **The "one app for the household" idea is not new.** Flatastic already sells it. Coloc4's differentiation cannot be the feature list.
2. **The differentiation hypothesis** (to be falsified in the M1 trial) is:
   - **Trust in the money engine**: balances that explain themselves ("why do I owe 18,50 €?"), with exact integer arithmetic and no paywall on core money actions (unlike Splitwise's daily cap).
   - **French-first, no install**: a mobile web/PWA link that works straight from the WhatsApp group.
   - **Speed**: an expense in under 30 s with defaults (payer = me, everyone, equal split).
3. **Complexity to avoid** (seen across competitors): multi-currency, bank integration, chat (the WhatsApp group already exists), gamification, and premium tiers on core actions.
4. **Consequence for scope**: the M1 = MONEY WORKS ordering is correct. Chores and shopping are commodity features, so the reason to exist must be proven on money first.

```text
RISK R-01: if M1 users say "Tricount already does this", Coloc4's value rests
entirely on V1 household features where Flatastic already exists.
This is a product risk, not an engineering risk. It is measured by §24 falsification.
```

---

## 2. Open-source resource evaluation

| Field | Spliit | SplitPro | I Hate Money | supabase-test-helpers (Basejump) |
|---|---|---|---|---|
| URL | github.com/spliit-app/spliit | github.com/oss-apps/split-pro | github.com/spiral-project/ihatemoney | github.com/usebasejump/supabase-test-helpers |
| DATE_CHECKED | 2026-10-03 | 2026-10-03 | 2026-10-03 | 2026-10-03 |
| LICENSE | MIT (GitHub API) | MIT (GitHub API) | GitHub API: `NOASSERTION`. README describes a "BSD beerware derivative". | MIT (GitHub API) |
| STARS | 2,969 | 1,460 | 1,392 | 132 |
| LAST_ACTIVITY (pushed_at) | 2026-10-01 | 2026-10-01 | 2026-08-07 | **2024-05-15** (stale) |
| MAINTENANCE | Active | Active | Active | Low |
| STACK | Next.js, Prisma, Postgres, shadcn/ui, Tailwind, Playwright | Next.js, tRPC, Prisma, Postgres, NextAuth | Python/Flask | SQL (pgTAP helpers) |
| WHAT_IT_SOLVES | Group balances, reimbursement suggestions | Splits, balances via DB views | Shared budget, settle plan | Creating auth users and impersonating them in pgTAP RLS tests |
| ARCHITECTURAL_LESSON | Its `src/lib/balances.ts` has a comment saying float accumulation and per-participant rounding "used to break the books" by leaving residue in the group total. This directly validates the bigint rule. Its reimbursement sort is designed to be "stable across reimbursements". | Balances are computed on the fly from DB views, with expenses as the source of truth. This validates "no mutable balance counters". | Settle plan computed from balances; nothing new. | Pattern for RLS tests: `tests.create_supabase_user`, `authenticate_as`. |
| REUSABLE_CODE | None. Uses JS `number`. | None (Prisma/tRPC, different auth model) | None (Python) | Possibly, but stale → copy the pattern, not the dependency |
| REUSABLE_PATTERN | Stability property for recommendations (→ §10.6 P-8) | View-based balances | — | Impersonation in SQL tests |
| SECURITY_RISK | n/a (not imported) | n/a | n/a | Low (test-only), but unmaintained |
| INTEGRATION_COST | n/a | n/a | n/a | Low |
| **DECISION** | **PATTERN_ONLY** | **PATTERN_ONLY** | **INSPIRATION** | **PATTERN_ONLY** (write ~30 lines of our own helpers) |

Supabase official documentation consulted (2026-10-03):

| Topic | Key finding used in this design | URL |
|---|---|---|
| RLS performance | Wrap `auth.uid()` as `(select auth.uid())`. Always specify `to authenticated`. Index policy columns. | https://supabase.com/docs/guides/database/postgres/row-level-security |
| SECURITY DEFINER | "A `security definer` function in an exposed schema is callable over the Data API with the creator's privileges." → helpers go in `private`; RPCs in `public` must do their own `auth.uid()` checks. | same |
| Testing | pgTAP via `supabase test db`; CI with `supabase start`; test negative cases | https://supabase.com/docs/guides/local-development/testing/overview |
| Next.js auth | `@supabase/ssr`; "Always use `supabase.auth.getClaims()` to protect pages and user data." | https://supabase.com/docs/guides/auth/server-side/nextjs |
| API keys | New `sb_publishable_…` (browser-safe) and `sb_secret_…` (bypasses RLS). Legacy `anon`/`service_role` deprecated "by the end of 2026". | https://supabase.com/docs/guides/api/api-keys |
| Realtime Postgres Changes | RLS is evaluated per subscriber. **"RLS policies are not applied to DELETE statements."** DELETE filtering needs `replica identity full`. | https://supabase.com/docs/guides/realtime/postgres-changes |
| Realtime Authorization | Private channels are authorized via RLS on `realtime.messages`. Requires `private: true` and disabling public access. | https://supabase.com/docs/guides/realtime/authorization |
| bigint over JSON | Values beyond 2^53−1 lose precision in JS `number`. postgrest-js added select casting (`col::text`). | https://github.com/supabase/postgrest-js/pull/429 |

---

## 3. PROMPT_CONFLICT_DETECTED

| # | Prompt rule | Problem | Proposed correction |
|---|---|---|---|
| PC-1 | §5.1/§6 `households.created_by_member_id` (nullable during bootstrap) | Creates a circular FK (households ↔ household_members) that forces either nullability forever or a deferred constraint. It duplicates information: the owner is already `household_members.role = 'owner'`, and the creator is recorded in `activity_logs`. | **Drop the column.** Bootstrap becomes 2 inserts with no circularity. Test §14.8 becomes "exactly 1 household + exactly 1 active owner + 1 `household.created` activity whose actor is that owner". Fallback if the human wants the column kept: nullable, composite FK `(id, created_by_member_id) → household_members(household_id, id)`, set in the same RPC. No deferred constraint is needed. → **OD-01** |
| PC-2 | §9.7 `household_members.user_id ON DELETE SET NULL` "as safety net" | With the CHECK `active → user_id NOT NULL`, SET NULL makes an auth delete **fail** for active members anyway. For `left` members it silently nulls `user_id` but leaves the real name in `display_name_snapshot`, so the account looks deleted but is not anonymized (a privacy failure that looks like success). | **`ON DELETE RESTRICT`.** Deleting an auth user is then impossible until the explicit anonymization procedure (§11.4) has run. This is a real safety net, not a silent partial one. → **OD-02** |
| PC-3 | §9.6 currency immutable if a **non-deleted** expense/settlement exists | Soft-deleted records still hold amounts in the original currency. They can be restored or exported. Changing currency after deleting everything would make them be reinterpreted. | Immutable if **any** expense or settlement exists, deleted or not. |
| PC-4 | §7.6 order: EXPIRED/REVOKED are checked before ALREADY_MEMBER | An existing member who taps an old link sees "Invitation expirée", which is confusing and the wrong next action. | Check **ALREADY_MEMBER right after the token is found** (it consumes nothing and leaks nothing new to an already-authorized member), then archived/revoked/expired/exhausted. |
| PC-5 | §11.8 "rate-limited" invitation tokens | Supabase RPCs are directly callable through the Data API, so an application-layer rate limit (Next.js) can be bypassed. With 256-bit tokens brute force is not a realistic threat; the rate limit mostly guards against abuse and noise. | Minimal DB-side limit: `private.join_attempts(user_id, attempted_at)`, at most 20 attempts / 10 min / user, enforced inside `join_household`. New result code **`RATE_LIMITED`**. → **OD-03** |
| PC-6 | §4.1 input examples use `.` only | French users type `42,37`. | The parser accepts **`,` or `.`** as decimal separator (exactly one). It rejects thousands separators, signs and more than 2 decimals. |
| PC-7 | §4.5 "sort participants using `member_id ASC`" | It doesn't say *how* to compare UUIDs. JS `localeCompare` ≠ Postgres `uuid` ordering. | Define the order as **byte order of the UUID = lexicographic order of the canonical lowercase hex string**, compared with `<` (not `localeCompare`). Postgres `uuid` comparison is bytewise, so both sides agree. Cross-implementation test required (T-0008). Postgres side `UNVERIFIED` until that test runs. |
| PC-8 | §4.10 algorithm description (sort once, then match) | It is ambiguous whether to re-sort after each transfer. Without re-sorting, recording the first recommendation can change the remaining ones, which hurts the explainability goal. | **Re-select the max debtor/creditor at every step** (n ≤ 8, cost is irrelevant). This gives stability property P-8: after recording recommendation #1 exactly, the new recommendations equal #2..k. |
| PC-9 | §4.6 participants must be active "at creation" — rule for **edits** not stated | Editing an old expense that involves someone who has since left would be impossible if "active" were re-checked on all participants. | On edit: participants/payer already on the expense may stay even if no longer active. **Newly added** participants/payer must be active. |
| PC-10 | §4.13 settlement recorded by "an ACTIVE involved member" | If **both** parties have left, their mutual debt can never be recorded. | Accept for M1 (an edge case; the debt stays visible). → **OD-04** (option: let the owner record on their behalf, with an activity log entry). |
| PC-11 | No upper bound on amounts | Typos ("80000" instead of "80,00") and overflow-adjacent values | `CHECK amount_minor <= 100000000` (1 000 000,00 €) on expenses and settlements. → **OD-05** |

None of these changes money semantics except PC-3, PC-8 and PC-9, which make them stricter or clarify them. All are listed under §16 OPEN DECISIONS for approval.

---

## 4. Architecture options

| Criterion | **A. Next.js + Supabase (RLS + SQL RPCs)** | B. Next.js + separate API (e.g. Fastify/Nest) + Postgres | C. Next.js full-stack + ORM (Prisma/Drizzle) + app-level auth (Spliit/SplitPro style) |
|---|---|---|---|
| Implementation complexity | Low–medium. Logic is split between TS (pure domain) and SQL (RPCs). | High: two deployables, own auth or integration work | Medium |
| Security | Isolation enforced **in the database** (RLS + composite FKs). Defence in depth even if app code has a bug. | Enforced in API code; the DB trusts the API | Enforced in app code only. One missed `where household_id` = a leak. |
| RLS integration | Native | Possible but unusual | Usually none |
| Testing | pgTAP for RLS/RPCs, Vitest for domain, Playwright E2E. Local stack via Supabase CLI. | Good, more harness work | Good, but isolation tests rely on app paths |
| Operational burden | Low (managed Postgres + Auth + Realtime) | High | Medium (Auth provider + DB host) |
| Vendor lock-in | Medium. Postgres, SQL and RLS are portable. Supabase Auth/Realtime are the coupling. | Low | Low–medium |
| Cost (2–8-person households, trial) | Free tiers likely sufficient (`UNVERIFIED`: current Supabase free-tier limits not checked this session) | Higher | Low |
| Realtime | Built-in (V1 shopping spike) | Must build/buy | Must build/buy |
| Migration path | Can later move RPC logic behind an API without changing the schema | — | Hard to add DB-level isolation later |

**Recommendation: Option A.** It is the only option where the hardest requirements (§9.3 cross-household integrity, §11 isolation, §4.15 atomic writes, §7.5 race-free joins) are enforced by Postgres itself, with the least operational burden. The cost is writing careful PL/pgSQL. This is mitigated by keeping the RPCs small, testing them with pgTAP, and keeping the pure money logic in TypeScript.

Boundary rule:

```text
Browser ──(publishable key + user JWT)──► Supabase Data API
   │                                         ├─ SELECT on tables/views → RLS
   │                                         └─ RPC (SECURITY DEFINER, own auth.uid() checks)
   └─► Next.js Server Components / Server Actions (user-scoped client via @supabase/ssr)
No sb_secret key in M1 runtime code at all. It is used only by the
account-deletion procedure (server-only), seed scripts and tests.
```

---

## 5. Stack (versions verified on the npm registry, 2026-10-03)

| Package | Latest | Published | Licence | Decision |
|---|---|---|---|---|
| next | 16.3.8 | 2026-09-30 | MIT | Use 16.x, App Router |
| react | 19.3.0 | 2026-09-09 | MIT | Use with Next |
| typescript | 7.0.2 | 2026-07-08 | Apache-2.0 | **Ecosystem compatibility `UNVERIFIED`** → T-0001 checks Next 16 + Vitest + ESLint with TS 7. Fallback is 6.0.3. → OD-06 |
| tailwindcss | 4.3.3 | 2026-07-16 | MIT | Use |
| shadcn/ui | (copy-in components, not an npm dep) | — | MIT (`UNVERIFIED` this session) | Use selectively |
| @supabase/supabase-js | 2.117.2 | 2026-09-25 | MIT | Use |
| @supabase/ssr | 0.12.7 | 2026-09-08 | MIT | Use (pre-1.0 → pin exact version) |
| supabase (CLI) | 2.119.0 | 2026-09-30 | MIT | Local stack, migrations, `test db` |
| vitest | 5.0.3 | 2026-09-30 | MIT | Unit / property tests |
| fast-check | 4.10.2 | 2026-09-19 | MIT | Property-based tests |
| @fast-check/vitest | 0.5.0 | 2026-09-11 | MIT | Integration |
| @playwright/test | 1.63.0 | 2026-09-04 | Apache-2.0 | E2E |
| zod | 4.6.5 | 2026-09-13 | MIT | Boundary validation of form/RPC payloads |

Next.js 16 lifecycle "LTS until 2027-10-21" comes from a third-party page only (versio.io) → `UNVERIFIED`. Postgres major version of a new Supabase project → `UNVERIFIED`. The design needs **PG ≥ 15** (for `security_invoker` views); T-0001 confirms it.

---

## 6. ADRs (one-line decisions)

| ADR | Decision |
|---|---|
| **ADR-001 Stack** | Option A: Next.js 16 App Router + TypeScript strict + Tailwind/shadcn + Supabase (Postgres, Auth, Realtime later) + Vitest/fast-check + Playwright + Supabase CLI migrations, deployed on Vercel. |
| **ADR-002 Membership identity** | `household_members.id` is the permanent historical identity. `user_id` is a nullable, mutable access link. All history references `(household_id, member_id)` through composite FKs. |
| **ADR-003 RLS strategy** | RLS on every `public` table. SELECT-only policies `to authenticated` using `private.is_active_member()`. **No direct INSERT/UPDATE/DELETE grants** on household tables. All writes go through SECURITY DEFINER RPCs with `set search_path = ''` that derive the actor from `auth.uid()`. |
| **ADR-004 Money representation** | EUR-only M1. `bigint` minor units in the DB. `bigint` in TS. Strings of minor units across JSON. `,`/`.` decimal input with at most 2 decimals. Equal-split remainder goes 1 unit at a time in UUID byte order. |
| **ADR-005 Debt simplification** | Deterministic greedy that re-selects max |debt| and max credit at each step (ties broken by UUID byte order). At most n−1 transfers. Not claimed minimal. Recommendations are computed, never stored. |
| **ADR-006 Invitations** | 256-bit random token, SHA-256 stored. Default reusable, 7 days, max_uses 10, revocable. Single `join_household(token)` RPC holding `FOR UPDATE` on the invitation row. DB-side attempt limit. |
| **ADR-007 Realtime scope** | No realtime in M1. V1 shopping only, and only after Spike 5. The leading candidate is **Broadcast on private channels** (RLS on `realtime.messages`), because Postgres Changes does not apply RLS to DELETEs. Normal refresh is always the fallback. |
| **ADR-008 Chore rotation** | (V1) Round-robin over `chore_rotation_members.position`, skipping non-active members. Only the next occurrence is materialized. Completion by someone else doesn't shift the rotation. |
| **ADR-009 Currency lifecycle** | `households.currency` with `CHECK (currency = 'EUR')` in M1. A trigger forbids changing it once **any** expense/settlement exists (PC-3). Money tables inherit currency. |
| **ADR-010 Account deletion** | Server-side procedure: anonymize every membership ("Ancien colocataire N", per-household counter), delete the profile, then delete the auth user. `household_members.user_id ON DELETE RESTRICT` (PC-2). Financial rows are kept. No compliance claim. |
| **ADR-011 Household bootstrap** | `create_household(name, timezone)` inserts the household, the owner membership and the activity in one transaction. No `created_by_member_id` column (PC-1). |

---

## 7. M1 data model — DDL draft (not executed)

```sql
-- ============ schemas & types ============
create schema if not exists private;          -- NOT in exposed API schemas
revoke all on schema private from public, anon;
grant usage on schema private to authenticated; -- needed so RLS policies can call helpers

create type public.member_role   as enum ('owner', 'member');
create type public.member_status as enum ('active', 'left', 'anonymized');
create type public.split_mode    as enum ('equal', 'exact');

-- ============ profiles (private to owner) ============
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============ households ============
create table public.households (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (char_length(btrim(name)) between 1 and 60),
  currency               char(3) not null default 'EUR' check (currency = 'EUR'),   -- ADR-009
  timezone               text not null,              -- validated against pg_timezone_names in RPC
  anonymized_member_seq  integer not null default 0, -- "Ancien colocataire N" counter
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  archived_at            timestamptz
);

-- ============ household_members (ADR-002) ============
create table public.household_members (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households(id) on delete restrict,
  user_id               uuid references auth.users(id) on delete restrict,          -- PC-2
  display_name_snapshot text not null check (char_length(btrim(display_name_snapshot)) between 1 and 60),
  role                  public.member_role   not null default 'member',
  status                public.member_status not null default 'active',
  joined_at             timestamptz not null default now(),
  left_at               timestamptz,
  anonymized_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint hm_household_id_key unique (household_id, id),        -- target of composite FKs
  constraint hm_household_user_key unique (household_id, user_id), -- NULLs allowed multiple times

  constraint hm_active_shape check (
    status <> 'active' or (user_id is not null and left_at is null and anonymized_at is null)),
  constraint hm_left_shape check (
    status <> 'left' or (left_at is not null and anonymized_at is null)),
  constraint hm_anonymized_shape check (
    status <> 'anonymized' or (user_id is null and anonymized_at is not null)),
  constraint hm_owner_active check (role <> 'owner' or status = 'active')
);
create unique index hm_one_owner_per_household
  on public.household_members (household_id) where role = 'owner';
create index hm_user_active_idx
  on public.household_members (user_id, household_id) where status = 'active';  -- RLS helper path

-- ============ invitations (ADR-006) ============
create table public.household_invitations (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households(id),
  token_hash           bytea not null unique,      -- sha256(raw token)
  created_by_member_id uuid not null,
  expires_at           timestamptz not null,
  max_uses             integer not null check (max_uses between 1 and 50),
  use_count            integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
  revoked_at           timestamptz,
  created_at           timestamptz not null default now(),
  foreign key (household_id, created_by_member_id)
    references public.household_members (household_id, id)
);
create index hi_household_idx on public.household_invitations (household_id);

-- ============ expenses ============
create table public.expenses (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households(id),
  title                text not null check (char_length(btrim(title)) between 1 and 80),
  amount_minor         bigint not null check (amount_minor > 0 and amount_minor <= 100000000), -- PC-11
  paid_by_member_id    uuid not null,
  split_mode           public.split_mode not null,
  spent_on             date not null,
  created_by_member_id uuid not null,
  deleted_at           timestamptz,
  deleted_by_member_id uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint exp_household_id_key unique (household_id, id),
  foreign key (household_id, paid_by_member_id)    references public.household_members (household_id, id),
  foreign key (household_id, created_by_member_id) references public.household_members (household_id, id),
  foreign key (household_id, deleted_by_member_id) references public.household_members (household_id, id),
  constraint exp_deleted_pair check ((deleted_at is null) = (deleted_by_member_id is null))
);
create index exp_household_idx on public.expenses (household_id, spent_on desc) where deleted_at is null;

-- ============ expense_shares ============
create table public.expense_shares (
  expense_id         uuid not null,
  household_id       uuid not null,
  member_id          uuid not null,
  share_amount_minor bigint not null check (share_amount_minor >= 0),
  primary key (expense_id, member_id),
  foreign key (household_id, expense_id) references public.expenses (household_id, id) on delete cascade,
  foreign key (household_id, member_id)  references public.household_members (household_id, id)
);
create index es_household_member_idx on public.expense_shares (household_id, member_id);

-- ============ settlements ============
create table public.settlements (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households(id),
  from_member_id       uuid not null,
  to_member_id         uuid not null,
  amount_minor         bigint not null check (amount_minor > 0 and amount_minor <= 100000000),
  settled_on           date not null,
  created_by_member_id uuid not null,
  deleted_at           timestamptz,
  deleted_by_member_id uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint st_not_self check (from_member_id <> to_member_id),
  foreign key (household_id, from_member_id)       references public.household_members (household_id, id),
  foreign key (household_id, to_member_id)         references public.household_members (household_id, id),
  foreign key (household_id, created_by_member_id) references public.household_members (household_id, id),
  foreign key (household_id, deleted_by_member_id) references public.household_members (household_id, id),
  constraint st_deleted_pair check ((deleted_at is null) = (deleted_by_member_id is null))
);
create index st_household_idx on public.settlements (household_id) where deleted_at is null;

-- ============ activity_logs (append-only, not event sourcing) ============
create table public.activity_logs (
  id              bigint generated always as identity primary key,
  household_id    uuid not null references public.households(id),
  actor_member_id uuid,                 -- NULL = system (e.g. anonymization)
  action          text not null,        -- 'expense.created', 'member.joined', ...
  entity_type     text not null,
  entity_id       uuid,
  summary         jsonb not null default '{}'::jsonb,  -- ids + amounts only, no free text
  created_at      timestamptz not null default now(),
  foreign key (household_id, actor_member_id) references public.household_members (household_id, id)
);
create index al_household_idx on public.activity_logs (household_id, created_at desc);
```

**Composite FK note:** with the default `MATCH SIMPLE`, a NULL `deleted_by_member_id` / `actor_member_id` skips the check, which is the intended behaviour. A non-NULL value from another household is rejected by Postgres (test §13.5).

### 7.1 Share-sum invariant (deferred constraint trigger)

Decision: **include it.** It is small, Postgres constraint triggers are a documented mechanism, and correctness ranks above simplicity. Spike 2 must prove it fires at COMMIT inside the RPC.

```sql
create function private.assert_expense_balanced(p_expense_id uuid) returns void
language plpgsql set search_path = '' as $$
declare v_amount bigint; v_sum numeric; v_positive int;
begin
  select e.amount_minor into v_amount from public.expenses e where e.id = p_expense_id;
  if not found then return; end if;   -- hard-deleted together with its shares
  select coalesce(sum(s.share_amount_minor), 0), count(*) filter (where s.share_amount_minor > 0)
    into v_sum, v_positive
    from public.expense_shares s where s.expense_id = p_expense_id;
  if v_sum <> v_amount or v_positive = 0 then
    raise exception 'expense % shares sum % <> amount %', p_expense_id, v_sum, v_amount
      using errcode = '23514';
  end if;
end $$;

create function private.trg_expense_balanced() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'expenses' then
    perform private.assert_expense_balanced(new.id);
  else
    perform private.assert_expense_balanced(coalesce(new.expense_id, old.expense_id));
  end if;
  return null;
end $$;

create constraint trigger expense_shares_balanced
  after insert or update or delete on public.expense_shares
  deferrable initially deferred for each row execute function private.trg_expense_balanced();
create constraint trigger expenses_balanced
  after insert or update of amount_minor on public.expenses
  deferrable initially deferred for each row execute function private.trg_expense_balanced();
```

### 7.2 Currency immutability (ADR-009, PC-3)

```sql
create function private.trg_households_currency_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.currency is distinct from old.currency and (
       exists (select 1 from public.expenses    where household_id = old.id)
    or exists (select 1 from public.settlements where household_id = old.id)) then
    raise exception 'currency is immutable once financial history exists' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger households_currency_immutable before update of currency on public.households
  for each row execute function private.trg_households_currency_immutable();
```

### 7.3 Balance view (no stored counters)

`sum(bigint)` returns `numeric` in Postgres, so there is no overflow and no precision loss. It is exposed as **text** so it never becomes a JS `number`.

```sql
create view public.member_balances with (security_invoker = true) as
select m.household_id, m.id as member_id, m.display_name_snapshot, m.status,
  ( coalesce((select sum(e.amount_minor) from public.expenses e
              where e.household_id = m.household_id and e.paid_by_member_id = m.id and e.deleted_at is null), 0)
  - coalesce((select sum(s.share_amount_minor) from public.expense_shares s
              join public.expenses e on e.id = s.expense_id
              where s.household_id = m.household_id and s.member_id = m.id and e.deleted_at is null), 0)
  + coalesce((select sum(t.amount_minor) from public.settlements t
              where t.household_id = m.household_id and t.from_member_id = m.id and t.deleted_at is null), 0)
  - coalesce((select sum(t.amount_minor) from public.settlements t
              where t.household_id = m.household_id and t.to_member_id = m.id and t.deleted_at is null), 0)
  )::text as net_minor
from public.household_members m;
```

`security_invoker = true` means the underlying tables' RLS applies to the caller. The UI still recomputes `SUM(net) = 0` via the TS domain as an invariant check and reports a critical signal if it fails (§18 of the prompt).

---

## 8. Security and RLS design

### 8.1 Helpers

```sql
create function private.is_active_member(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id
      and m.user_id = (select auth.uid())
      and m.status = 'active');
$$;

create function private.current_member_id(p_household_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.household_members m
  where m.household_id = p_household_id
    and m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

revoke all on function private.is_active_member(uuid), private.current_member_id(uuid) from public, anon;
grant execute on function private.is_active_member(uuid), private.current_member_id(uuid) to authenticated;
```

SECURITY DEFINER on a function that reads `household_members` is what avoids **RLS recursion**: the `household_members` SELECT policy calls this helper, and the helper itself is not subject to that policy. It lives in `private`, which is not exposed, as the Supabase docs require.

### 8.2 Grants and policies

```sql
-- Baseline: no direct writes for API roles on household tables.
revoke insert, update, delete on
  public.households, public.household_members, public.household_invitations,
  public.expenses, public.expense_shares, public.settlements, public.activity_logs
from anon, authenticated;
revoke all on all tables in schema public from anon;

alter table public.profiles              enable row level security;
alter table public.households            enable row level security;
alter table public.household_members     enable row level security;
alter table public.household_invitations enable row level security;
alter table public.expenses              enable row level security;
alter table public.expense_shares        enable row level security;
alter table public.settlements           enable row level security;
alter table public.activity_logs         enable row level security;

-- profiles: owner only (§11.10 "B cannot read A's profile")
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- household-scoped: SELECT only
create policy households_select on public.households for select to authenticated
  using ((select private.is_active_member(id)));
create policy hm_select on public.household_members for select to authenticated
  using ((select private.is_active_member(household_id)));
create policy exp_select on public.expenses for select to authenticated
  using ((select private.is_active_member(household_id)));
create policy es_select on public.expense_shares for select to authenticated
  using ((select private.is_active_member(household_id)));
create policy st_select on public.settlements for select to authenticated
  using ((select private.is_active_member(household_id)));
create policy al_select on public.activity_logs for select to authenticated
  using ((select private.is_active_member(household_id)));
create policy hi_select on public.household_invitations for select to authenticated
  using ((select private.is_active_member(household_id)));

-- Column privilege: members may list invitations but never read token_hash.
revoke select on public.household_invitations from authenticated;
grant select (id, household_id, created_by_member_id, expires_at, max_uses, use_count, revoked_at, created_at)
  on public.household_invitations to authenticated;
```

Wrapping `private.is_active_member(...)` in `(select …)` lets the planner treat it as an initPlan (evaluated once per statement), following the Supabase performance guidance. The win only applies when the argument doesn't depend on the row. The real benefit has to be **measured** in Spike 1 rather than assumed.

### 8.3 RPC security rules (all write RPCs)

```text
SECURITY DEFINER · SET search_path = '' · fully qualified names
first statement: v_uid := auth.uid(); if null → raise 28000
actor := private.current_member_id(p_household_id); if null → raise 42501
never accept user_id / actor_member_id from the caller
revoke execute from public, anon; grant execute to authenticated
amount parameters are TEXT, parsed with '^[0-9]{1,12}$' (no JSON-number ambiguity)
```

### 8.4 CI RLS check (§11.7)

```sql
-- Fails CI if any table in an exposed schema lacks RLS.
select n.nspname, c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname in ('public')  -- + any future exposed schema
  and not c.relrowsecurity;
-- expected: 0 rows (pgTAP: is_empty(...))
```

### 8.5 Secrets

- `sb_publishable_…` is the only key in browser and `NEXT_PUBLIC_*` code.
- `sb_secret_…` is used only in: the account-deletion server action (server-only module guarded with `import 'server-only'`), seed scripts and tests. It is never logged.
- The legacy `anon`/`service_role` keys are deprecated by the end of 2026 (Supabase docs), so the project starts directly on the new key types.

---

## 9. RPC specifications

### 9.1 `create_household(p_name text, p_timezone text) → uuid` (ADR-011)

```sql
create function public.create_household(p_name text, p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text; v_display text; v_hh uuid; v_member uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  v_name := btrim(p_name);
  if v_name is null or char_length(v_name) not between 1 and 60 then
    raise exception 'invalid name' using errcode = '22023'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid timezone' using errcode = '22023'; end if;
  select display_name into v_display from public.profiles where user_id = v_uid;
  if v_display is null then raise exception 'profile required' using errcode = 'P0001'; end if;

  insert into public.households (name, timezone) values (v_name, p_timezone) returning id into v_hh;
  insert into public.household_members (household_id, user_id, display_name_snapshot, role, status)
    values (v_hh, v_uid, v_display, 'owner', 'active') returning id into v_member;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
    values (v_hh, v_member, 'household.created', 'household', v_hh);
  return v_hh;
end $$;
```

The function body is a single transaction. Any exception rolls back all three inserts. Failure-injection test: §13.6.

### 9.2 `create_invitation(p_household_id uuid) → text` (raw token, returned once)

```text
actor := current_member_id(p_household_id) (any active member — ASSUMPTION A-01, OD-07)
household not archived
raw := encode(extensions.gen_random_bytes(32), 'base64') → base64url (256 bits)
insert (token_hash = sha256(convert_to(raw,'UTF8')), expires_at = now()+'7 days', max_uses = 10)
activity 'invitation.created' (no token in summary)
return raw   -- URL built client-side: /rejoindre#<raw>  (fragment: not sent in Referer/server logs)
```

`revoke_invitation(p_invitation_id)` sets `revoked_at`. Any active member may call it (ASSUMPTION A-01).

> Raw token in the URL **fragment** (`#`) rather than path/query: fragments are not sent to servers or in Referer headers, which helps §11.8 "never log raw invitation links". The page reads the fragment client-side and calls the RPC. → OD-08

### 9.3 `join_household(p_token text) → (result_code text, target_household_id uuid)` (ADR-006)

```sql
create function public.join_household(p_token text)
returns table (result_code text, target_household_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.household_invitations%rowtype;
  v_hh  public.households%rowtype;
  v_mem public.household_members%rowtype;
  v_display text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  -- PC-5 rate limit
  if (select count(*) from private.join_attempts
      where user_id = v_uid and attempted_at > now() - interval '10 minutes') >= 20 then
    return query select 'RATE_LIMITED', null::uuid; return;
  end if;
  insert into private.join_attempts (user_id) values (v_uid);

  if p_token is null or char_length(p_token) not between 32 and 64 then
    return query select 'INVALID', null::uuid; return;
  end if;

  select * into v_inv from public.household_invitations
   where token_hash = pg_catalog.sha256(convert_to(p_token, 'UTF8'))
   for update;                                             -- serializes joins on this invitation
  if not found then return query select 'INVALID', null::uuid; return; end if;

  select * into v_hh from public.households where id = v_inv.household_id;
  if v_hh.archived_at is not null then return query select 'INVALID', null::uuid; return; end if;

  select * into v_mem from public.household_members
   where household_id = v_inv.household_id and user_id = v_uid for update;
  if v_mem.id is not null and v_mem.status = 'active' then              -- PC-4: before expiry checks
    return query select 'ALREADY_MEMBER', v_inv.household_id; return;  -- use_count untouched
  end if;

  if v_inv.revoked_at is not null       then return query select 'REVOKED',   null::uuid; return; end if;
  if v_inv.expires_at <= now()          then return query select 'EXPIRED',   null::uuid; return; end if;
  if v_inv.use_count >= v_inv.max_uses  then return query select 'EXHAUSTED', null::uuid; return; end if;

  select display_name into v_display from public.profiles where user_id = v_uid;
  if v_display is null then raise exception 'profile required' using errcode = 'P0001'; end if;

  if v_mem.id is not null and v_mem.status = 'left' then
    update public.household_members
       set status = 'active', left_at = null, display_name_snapshot = v_display, updated_at = now()
     where id = v_mem.id;
    result_code := 'REACTIVATED';
  else
    -- anonymized rows have user_id NULL, so they are never matched above → a new identity (§5.8)
    insert into public.household_members (household_id, user_id, display_name_snapshot)
    values (v_inv.household_id, v_uid, v_display) returning id into v_mem.id;
    result_code := 'JOINED';
  end if;

  update public.household_invitations set use_count = use_count + 1 where id = v_inv.id;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
    values (v_inv.household_id, v_mem.id, 'member.' || lower(result_code), 'household_member', v_mem.id);

  target_household_id := v_inv.household_id;
  return next;
end $$;
```

**Concurrency argument (to be proven by Spike 4, not assumed).** Under READ COMMITTED, a second transaction blocked on `FOR UPDATE` re-reads the *latest committed version* of the locked row once the lock is released. It therefore sees `use_count = 1` and returns `EXHAUSTED`. Two concurrent joins by the **same** user also serialize on the invitation lock: the second sees an active membership and returns `ALREADY_MEMBER`. `UNIQUE(household_id, user_id)` is the final backstop.

Caveat: the `join_attempts` insert in a request that then returns early is committed, because a `RETURN` is not an error. That is intended.

| Code | French message | Next action |
|---|---|---|
| JOINED | « Bienvenue dans {colocation} ! » | Go to the household |
| REACTIVATED | « Content de te revoir dans {colocation}. » | Go to the household |
| ALREADY_MEMBER | « Tu fais déjà partie de cette colocation. » | Open the household |
| EXPIRED | « Ce lien d'invitation a expiré. » | Ask a roommate for a new link |
| REVOKED | « Ce lien d'invitation a été désactivé. » | Ask a roommate for a new link |
| EXHAUSTED | « Ce lien a atteint son nombre maximal d'utilisations. » | Ask for a new link |
| INVALID | « Ce lien d'invitation n'est pas valide. » | Check the link or ask for a new one |
| RATE_LIMITED | « Trop de tentatives. Réessaie dans quelques minutes. » | Wait |

### 9.4 `create_expense(...) → uuid` (§4.15)

```text
create_expense(
  p_household_id uuid, p_title text, p_amount_minor text,
  p_paid_by_member_id uuid, p_split_mode split_mode, p_spent_on date,
  p_participants jsonb   -- equal: ["<uuid>", ...]
                         -- exact: [{"memberId":"<uuid>","amountMinor":"1234"}, ...]
) returns uuid

1. v_uid / actor := current_member_id(p_household_id) — else 42501
2. household not archived
3. amount := parse '^[0-9]{1,12}$' → bigint; 0 < amount <= 100000000
4. payer: member of household AND status = 'active'
5. participants: non-empty, no duplicates, all of this household, all status = 'active'
6. shares:
     equal → private.equal_split(amount, sorted participant uuids)  [server computes]
     exact → parse each amountMinor; each >= 0; ≥1 > 0; SUM = amount  [server validates]
7. insert expense, insert shares, insert activity {amount_minor, participant_count}
8. COMMIT → deferred constraint trigger re-checks SUM(shares) = amount
```

`private.equal_split`: `base = amount / n` (integer division), `r = amount % n`, and the first `r` members in `uuid` order get `base + 1`. The TS domain implements the same rule. The parity test is in T-0008.

`update_expense(p_expense_id, …)`: same validations, with **PC-9** for active checks. `delete from expense_shares where expense_id = …` then re-insert in the same transaction. The deferred trigger validates at commit. Activity `expense.updated` with `{old_amount_minor, new_amount_minor}` only.

`delete_expense(p_expense_id)`: soft delete by any active member (ASSUMPTION A-02). Activity entry.

### 9.5 `record_settlement(...) → (result_code text, settlement_id uuid)`

```text
record_settlement(p_household_id, p_from_member_id, p_to_member_id,
                  p_amount_minor text, p_settled_on date, p_confirm_overshoot boolean default false)

1. actor active; actor ∈ {from, to}                      (ASSUMPTION A-03, PC-10)
2. from <> to; both belong to household (FK); amount parsed and bounded
3. SELECT … FROM households WHERE id = p_household_id FOR UPDATE
   (serializes money writes per household → overshoot check is race-free; cheap at ≤8 users)
4. for each of from/to whose status <> 'active':
     net := private.member_net(household, member)
     from non-active: overshoot if net + amount > 0 when net < 0  (debt flips to credit)
     to   non-active: overshoot if net − amount < 0 when net > 0  (credit flips to debt)
     also overshoot if net is already 0 or has the "wrong" sign for the direction
   if overshoot and not p_confirm_overshoot → return ('CONFIRMATION_REQUIRED', null)
5. insert settlement; activity 'settlement.recorded' {amount_minor}
6. return ('RECORDED', id)
```

Signs follow §4.7: settlement **sent** adds to the sender's net, settlement **received** subtracts from the receiver's net. This is the mandatory test §13.1-T1.

### 9.6 Membership RPCs

| RPC | Rules |
|---|---|
| `leave_household(p_household_id)` | Actor active. If actor is owner → refuse with `OWNER_MUST_TRANSFER`. Otherwise `status='left', left_at=now()`. Returns the actor's `net_minor` (text) so the UI can warn « Tu as encore un solde non réglé. » before confirming. |
| `transfer_ownership(p_household_id, p_to_member_id)` | Actor is owner. Target is active. In one transaction, demote the actor and then promote the target (the partial unique index stays satisfied after each statement). |
| `archive_household(p_household_id)` | Owner only. Sets `archived_at`. Read-only afterwards (all write RPCs check it). |
| `update_my_display_name(p_name)` | Updates the profile, and **active** memberships' snapshots only (§5.4). |

---

## 10. Money domain (pure TypeScript)

Location: `src/modules/expenses/domain/`. It imports nothing outside the TS standard library.

### 10.1 Signatures

```typescript
export type MemberId = string            // canonical lowercase UUID
export type Minor = bigint

export type ParseError = 'EMPTY' | 'NOT_A_NUMBER' | 'TOO_MANY_DECIMALS' | 'NOT_POSITIVE' | 'TOO_LARGE'
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export function parseEurAmount(input: string): Result<Minor, ParseError>
// /^\s*(\d{1,7})(?:[.,](\d{1,2}))?\s*$/  → "42,37"→4237n "80"→8000n "3.5"→350n; "3.456"→TOO_MANY_DECIMALS
export function formatEur(minor: Minor, locale?: 'fr-FR'): string   // 4237n → "42,37 €"
                                                                    // built from bigint digits, no Number()
export function minorToWire(m: Minor): string                       // 4237n → "4237"
export function minorFromWire(s: string): Minor                     // /^-?\d+$/ else throw

export function compareMemberId(a: MemberId, b: MemberId): -1 | 0 | 1  // a < b on lowercase hex (PC-7)

export type ExpenseShare = { memberId: MemberId; amountMinor: Minor }
export function splitEqual(amount: Minor, participants: readonly MemberId[]): ExpenseShare[]
export type SplitError = 'NO_PARTICIPANT' | 'DUPLICATE_PARTICIPANT' | 'NEGATIVE_SHARE'
                       | 'ALL_ZERO' | 'SUM_MISMATCH'
export function validateExactSplit(amount: Minor, shares: readonly ExpenseShare[]):
  Result<ExpenseShare[], SplitError>
export function remainingToSplit(amount: Minor, shares: readonly ExpenseShare[]): Minor  // "reste à répartir"

export type LedgerExpense = { id: string; paidBy: MemberId; amountMinor: Minor;
                              shares: readonly ExpenseShare[]; deleted: boolean }
export type LedgerSettlement = { id: string; from: MemberId; to: MemberId;
                                 amountMinor: Minor; deleted: boolean }
export type MemberBalance = { memberId: MemberId; netMinor: Minor }
export function computeBalances(members: readonly MemberId[],
                                expenses: readonly LedgerExpense[],
                                settlements: readonly LedgerSettlement[]): MemberBalance[]
export function explainBalance(memberId: MemberId, ...same inputs): BalanceLine[]  // trust/explainability

export type SettlementRecommendation = { fromMemberId: MemberId; toMemberId: MemberId; amountMinor: Minor }
export function recommendSettlements(balances: readonly MemberBalance[]): SettlementRecommendation[]
// throws InvariantError if Σ net ≠ 0
```

### 10.2 Greedy (ADR-005, PC-8)

```text
work := copy(balances) filtered net ≠ 0           // input never mutated
while work has a creditor and a debtor:
  d := debtor with max |net|, tie → smallest memberId
  c := creditor with max net,  tie → smallest memberId
  x := min(|d.net|, c.net)
  emit (d → c, x)
  d.net += x ; c.net -= x ; drop members at 0
```

Proof sketch of ≤ n−1: each iteration zeroes at least one member, and the last iteration zeroes both remaining members (because Σ = 0). Every `x > 0`, and d ≠ c because their signs differ.

### 10.3 Property tests (fast-check)

| ID | Property |
|---|---|
| P-1 | `Σ splitEqual(a, ps) = a`, every share ∈ {⌊a/n⌋, ⌈a/n⌉}, extras go to the first `a mod n` in id order |
| P-2 | `validateExactSplit` accepts iff the §4.6 rules hold |
| P-3 | `Σ computeBalances(...).net = 0` for random ledgers (2–8 members, deletions, settlements, former members) |
| P-4 | Applying all recommendations as settlements → all nets = 0 |
| P-5 | `#recommendations ≤ (#non-zero members) − 1` |
| P-6 | Every recommendation has amount > 0 and from ≠ to |
| P-7 | Determinism: same input (any input order) → identical output |
| P-8 | Stability: record recommendation #1 → recompute → equals #2..k |
| P-9 | Inputs are deep-equal before and after (no mutation) |
| P-10 | `parseEurAmount(formatEur(x)) = x` for 0 < x ≤ max |

---

## 11. Membership lifecycle

```text
            join_household (JOINED)
   (none) ───────────────────────────► ACTIVE ◄──────────────┐
                                         │                    │ join_household (REACTIVATED)
                         leave_household │                    │ same auth account
                                         ▼                    │
                                        LEFT ─────────────────┘
                                         │
        account deletion procedure       │  (also from ACTIVE)
                                         ▼
                                    ANONYMIZED  (terminal, user_id NULL)
```

### 11.1 Account deletion procedure (ADR-010)

Server action, `sb_secret` client, one SQL function `private.anonymize_user(p_user_id)` executed **before** `auth.admin.deleteUser`:

```text
1. (product/legal) retention basis review — NOT a technical step, OD-09
2. for each membership of user (any status):
     if role = owner and other active members exist → refuse: transfer ownership first
     if role = owner and alone → archive household, role := member
     UPDATE households SET anonymized_member_seq = anonymized_member_seq + 1 … RETURNING seq  (row lock)
     membership := (user_id NULL, status 'anonymized', anonymized_at now(),
                    display_name_snapshot 'Ancien colocataire ' || seq)
     activity (actor NULL, 'member.anonymized')
3. DELETE profile
4. auth.admin.deleteUser(user_id)   ← succeeds only now (FK RESTRICT, PC-2)
```

If step 4 fails after steps 2–3 committed, the result is an anonymized account with a dangling auth user. The procedure is retryable and idempotent. This is a known risk, documented as R-06.

---

## 12. M1 UX (flows and copy)

| Screen | Content |
|---|---|
| Connexion | Email magic link or password (OD-10). Typed input is kept on error. |
| Profil (onboarding) | « Comment tes colocs t'appellent ? » (display name, required) |
| Créer / Rejoindre | Create: name + timezone (default from the browser, `Europe/Paris`). Join: via the link. |
| Rejoindre (`/rejoindre#token`) | Not logged in → auth → back. Then « Rejoindre {colocation} ? » with the name from a read-only `preview_invitation(token)` RPC (name + validity code only, counted in the same rate limit), then an explicit **Rejoindre** button → `join_household` (§7.4, ASSUMPTION A-04, OD-11). |
| Dépenses | List (title, amount, « Payé par Emma », date), with an empty state: « Aucune dépense pour le moment. Ajoutez votre première dépense commune. » FAB « Ajouter ». |
| Nouvelle dépense | Titre · Montant · Payé par (moi) · Participants (tous) · Répartition égale · Enregistrer. « Montants exacts » shows « Reste à répartir : 3,20 € ». |
| Soldes | « On te doit 42,00 € » / « Tu dois 18,50 € » / « Tu es à jour ». Recommendations: « Tu dois 20,00 € à Emma » → **Enregistrer un remboursement** (prefilled). « Pourquoi ? » shows the expense lines behind the balance. |
| Former members | « Lucas — ancien colocataire », « Ancien colocataire 2 » (icon + text, not colour only) |
| Colocation | Members, invite link (copy/share), revoke, leave, transfer ownership |

Navigation in M1: **Dépenses · Soldes · Colocation**. Only existing modules are shown (§13.3).

Errors are designed per §13.8. Strings live in `src/i18n/fr.ts`, and domain error codes map to strings there, not in the domain.

---

## 13. Test strategy (all `NOT_RUN`)

### 13.1 Mandatory money tests

| ID | Test | Layer |
|---|---|---|
| T1 | A=+2000, B=−2000; B→A settlement 2000 → A=0, B=0 | unit + DB view |
| T2 | 1000 / 3 → 334, 333, 333 by uuid order; TS = SQL `equal_split` | unit + cross-impl |
| T3 | §14.2 list: 2/3/4/8 members, multiple payers, payer not participant, exact, remainder, zero-balance, circular debts, partial settlement, edit, soft delete, former-member balance and settlement | unit |
| T4 | P-1…P-10 | property |

### 13.2 Identity (§14.5)

Leave keeps balances unchanged. Anonymization keeps `Σ net = 0` and gives two anonymized members distinct names. Rejoin reuses the same row id (`REACTIVATED`).

### 13.3 RLS matrix (pgTAP, §11.10)

Identities: A, C (active H1), B (active H2), D (left H1), E (anonymized H1, i.e. a deleted auth user, so tested as "no session possible"), anon.

| Table / op | A,C on H1 | B on H1 | D on H1 | anon |
|---|---|---|---|---|
| SELECT households, members, expenses, shares, settlements, activity, invitations | rows | 0 rows | 0 rows | 0 rows / denied |
| SELECT invitations.token_hash | permission denied | denied | denied | denied |
| direct INSERT/UPDATE/DELETE on any household table | permission denied | denied | denied | denied |
| SELECT another user's profile | 0 rows | 0 rows | 0 rows | denied |
| RPC create_expense on H1 | ok | 42501 | 42501 | denied |
| RPC with a member id from H2 inside H1 | rejected (validation / FK 23503) | — | — | — |

### 13.4 Concurrency (§14.9, Spike 4)

Two DB connections (Node `pg`, not supabase-js, to control timing) with JWT claims set via `set_config('request.jwt.claims', …)`. Barrier → both call `join_household` → assert {JOINED, EXHAUSTED} and `use_count = 1`. Repeat 100×.

### 13.5 Integrity

Cross-household FK violation (expense, share, settlement) → `23503`. Currency update after the first (even deleted) expense → `23514`. Shares sum mismatch inserted directly as `postgres` → fails at COMMIT.

### 13.6 Bootstrap rollback

pgTAP: call `create_household` with a profile missing → exception → 0 households, 0 members. Inject a failure after the household insert (test-only trigger raising on `activity_logs` insert) → 0/0.

### 13.7 E2E (Playwright)

E2E-1..4 from §14.11, run against the local Supabase stack with a seeded test project.

---

## 14. Technical spikes (exactly five)

| # | Question | Method | Success criteria | Timebox |
|---|---|---|---|---|
| S1 | Membership identity + RLS | Schema §7 + policies §8 locally. pgTAP matrix §13.3. EXPLAIN on the expenses list with 8 members × 2,000 expenses. | Matrix passes. No recursion error. Policy overhead measured and reported. | 1 day |
| S2 | Money engine | TS domain + P-1..P-10 + T1. Deferred trigger fires at commit. TS/SQL equal-split parity. | All PASS, 10k fast-check runs each | 1 day |
| S3 | Debt simplification | Greedy + P-4..P-9. Hand-check 5 scenarios with a non-developer ("can you explain this transfer?"). | Properties PASS. Explanation understood. | 0.5 day |
| S4 | Atomic invitation join | §13.4 harness, 100 iterations. Same-user double submit. ALREADY_MEMBER consumes 0. | 100/100 correct. `use_count` exact. | 1 day |
| S5 | Shopping realtime isolation (V1) | Compare (a) Postgres Changes + RLS vs (b) Broadcast private channel `household:{id}:shopping` + RLS on `realtime.messages`. Two households, delete events included. | Same-household sync. 0 cross-household messages (including DELETE). Fallback works with Realtime disabled. | 1 day, **after M1** |

---

## 15. M1 backlog

| Ticket | Title | Depends on | Spike |
|---|---|---|---|
| T-0001 | Bootstrap (detailed below) | approval | — |
| T-0002 | Profiles + private-profile RLS | 0001 | — |
| T-0003 | households + household_members schema, constraints, helpers, RLS | 0002 | S1 |
| T-0004 | `create_household` RPC + rollback test + create UX | 0003 | — |
| T-0005 | Invitations + `join_household` + concurrency tests + join UX | 0004 | S4 |
| T-0006 | Money parser/format/wire, equal & exact split (pure) | 0001 | S2 |
| T-0007 | Balances + greedy + property tests (pure) | 0006 | S2, S3 |
| T-0008 | expenses/shares/settlements schema, composite FKs, deferred sum trigger, currency trigger, balance view, write RPCs, RLS, TS↔SQL parity test | 0003, 0007 | S2 |
| T-0009 | Expense create/list UX | 0008 | — |
| T-0010 | Balances + recommendations + « Pourquoi ? » UX | 0008 | — |
| T-0011 | Settlement UX incl. former members + overshoot confirmation | 0010 | — |
| T-0012 | Leave / rejoin / transfer ownership / anonymization | 0005, 0008 | — |
| T-0013 | M1 E2E suite | 0009–0012 | — |
| T-0014 | Four-user real trial (2 weeks) | 0013 | — |

The pure domain (T-0006/7) can run in parallel with T-0002..5, but only one ticket is active at a time (§1.1).

### T-0001 — Bootstrap

```text
OBJECTIVE        Reproducible repo with Next.js, TS strict, local Supabase, Auth wiring, CI.
USER VALUE       None directly; enables every later ticket safely.
CONTEXT          ADR-001. Versions §5. Option A.
SCOPE            git init + branch; Next 16 App Router; TS strict (+ noUncheckedIndexedAccess);
                 ESLint; Tailwind; Vitest + fast-check; Playwright skeleton; supabase init/start;
                 @supabase/ssr clients (server/browser) using publishable key; getClaims()-guarded
                 layout; .env.example (no secrets); GitHub Actions: typecheck, lint, unit,
                 supabase start + `supabase test db` (one placeholder pgTAP test) + RLS-enabled check;
                 eslint rule banning Number(/parseFloat( inside src/modules/expenses/domain.
OUT OF SCOPE     Any table except the RLS check query; UI beyond a placeholder; deployment.
DEPENDENCIES     Human approval of this document; GitHub repo decision (OD-12).
FILES            package.json, tsconfig.json, next.config.ts, src/app/*, src/lib/supabase/*,
                 supabase/config.toml, supabase/tests/000_rls_enabled.sql, .github/workflows/ci.yml
DATA IMPACT      None.  MIGRATION IMPACT  None (empty migrations dir).
SECURITY IMPACT  Establishes key handling: only NEXT_PUBLIC_SUPABASE_URL +
                 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY public; secret key absent from app.
IMPLEMENTATION   1 scaffold 2 strict TS 3 supabase local 4 clients 5 CI 6 verify TS 7 compat (OD-06)
TESTS            placeholder unit test; pgTAP RLS-enabled check; `next build`.
ACCEPTANCE       Fresh clone → `npm ci && supabase start && npm test && npx supabase test db
                 && npm run build` all PASS locally and in CI.
EVIDENCE         Command outputs; CI run link; git status/diff --stat/log.
RISKS            TS 7 incompatibility → pin 6.0.x; Docker required for supabase start.
ROLLBACK         Delete branch.
DOCUMENTATION    README: setup, scripts, env vars.
STOP CONDITION   Acceptance proven or BLOCKED reported.
STATUS           NOT_STARTED
```

---

## 16. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | Product: competitors (Tricount, Flatastic) already "good enough" | M1 trial with §24 falsification. Explainability as differentiator. |
| R-02 | PL/pgSQL logic is harder to test/review than TS | Small RPCs, pgTAP, TS↔SQL parity tests, no business logic duplicated except equal split |
| R-03 | SECURITY DEFINER RPC in an exposed schema = privilege escalation if an `auth.uid()` check is missed | §8.3 checklist. A pgTAP test per RPC calls it as anon and as an outsider. Review gate. |
| R-04 | RLS helper cost at scale | Measured in S1. Trivial at 2–8 members. |
| R-05 | Supabase legacy key deprecation (end 2026) | Start on publishable/secret keys |
| R-06 | Account deletion partially done (anonymized, auth user remains) | Idempotent retry. Admin check query. |
| R-07 | TS 7.0 ecosystem maturity | Verified in T-0001. Fallback 6.0.3. |
| R-08 | Supabase free tier pauses inactive projects (`UNVERIFIED`) | Check before the trial |
| R-09 | Users enter amounts with typos | Upper bound, confirmation summary « 80,00 € partagés entre 4 → 20,00 € chacun » |

---

## 17. OPEN DECISIONS

| ID | Decision | Default (applied unless the human objects) | Needs human because |
|---|---|---|---|
| OD-00 | Section structure of this doc | As written | Original §25 truncated |
| OD-01 | Drop `households.created_by_member_id` (PC-1) | Drop | Changes a prompt-specified schema |
| OD-02 | `household_members.user_id ON DELETE RESTRICT` (PC-2) | RESTRICT | Data lifecycle / privacy |
| OD-03 | DB-side join rate limit + `RATE_LIMITED` code (PC-5) | 20 / 10 min / user | Security design |
| OD-04 | Settlements between two former members (PC-10) | Not supported in M1 | Money semantics |
| OD-05 | Max amount 1 000 000,00 € (PC-11) | Yes | Money semantics |
| OD-06 | TypeScript 7 vs 6 | Try 7, fallback 6.0.3 | Tooling |
| OD-07 | Who may create/revoke invitations (A-01) | Any active member | Product/security |
| OD-08 | Token in the URL fragment | Yes | Security |
| OD-09 | Legal retention basis for anonymized financial history | Must be reviewed before production. No compliance claimed. | Legal |
| OD-10 | Auth method (magic link vs password vs both) | Email + password, plus magic link if trivial | Auth architecture |
| OD-11 | Show the household name before "Rejoindre" (A-04) | Show it, via a read-only `preview_invitation(token)` RPC returning only the name and a validity code (the prompt §7.4 asks for it) | Privacy (anyone holding the link learns the name) |
| OD-12 | Git hosting / CI provider | GitHub + Actions | Outward-facing |
| A-02 | Any active member may soft-delete any expense | Yes, with an activity log entry | Product |
| A-03 | Settlement actor must be `from` or `to` | Yes | Product |

---

## 18. Sources (all checked 2026-10-03)

- Splitwise expense limit: https://feedback.splitwise.com/knowledgebase/articles/2010350-why-am-i-seeing-an-expense-limit
- Splitwise third-party review: https://www.kittysplit.com/en/splitwise-alternative
- Tricount premium change: https://tricount.com/en/what-happened-with-premium
- Tricount × bunq payments: https://help.tricount.com/articles/add-bunq-payments-as-expenses
- Flatastic: https://flatastic-app.com/ , https://alternativeto.net/software/flatastic/about
- Spliit: https://github.com/spliit-app/spliit (source file `src/lib/balances.ts` read via raw.githubusercontent.com)
- SplitPro: https://github.com/oss-apps/split-pro
- I Hate Money: https://github.com/spiral-project/ihatemoney , https://pypi.org/project/ihatemoney/7.0.1/
- supabase-test-helpers: https://github.com/usebasejump/supabase-test-helpers
- GitHub metadata: https://api.github.com/repos/{owner}/{repo}
- npm versions: https://registry.npmjs.org/{package}
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase testing: https://supabase.com/docs/guides/local-development/testing/overview
- Supabase Next.js SSR auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase Realtime Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Realtime Authorization: https://supabase.com/docs/guides/realtime/authorization
- postgrest-js bigint casting: https://github.com/supabase/postgrest-js/pull/429

---

```text
PHASE 0 — STOP
Awaiting human review of §3 (prompt conflicts) and §17 (open decisions).
Next action after approval: T-0001 only.
```
