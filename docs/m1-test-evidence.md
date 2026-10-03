# M1 — Test evidence

Status as of T-0013 (2026-10-03). Statuses are from local runs against the local Supabase stack. CI runs the same suites on every push to `main` (see `.github/workflows/ci.yml`).

| Suite | Command | Count | Status |
|---|---|---|---|
| Unit + property (Vitest, fast-check) | `npm test` | 110 | PASS |
| Database (pgTAP) | `npm run db:test` | 195 | PASS |
| Integration (real Postgres connections) | `npm run test:integration` | 8 | PASS |
| End-to-end (Playwright, mobile viewport, incl. axe WCAG A/AA) | `npm run test:e2e` | 25 | PASS |
| Four-user real trial (T-0014) | — | — | NOT_RUN |

## Requirement → tests

| Prompt requirement | Where |
|---|---|
| §4.1 parsing, §4.2 wire format, §4.5 rounding | `src/modules/expenses/domain/money.test.ts`, `split.test.ts` |
| §4.8 / §14.4 mandatory settlement sign test | `balances.test.ts` (T1), `supabase/tests/051_money_rpcs.test.sql` (SQL level) |
| §14.2 finance scenarios (2/3/4/8 members, multiple payers, payer not participant, exact, circular, partial, edit, soft delete, former member) | `balances.test.ts`, `051_money_rpcs.test.sql` |
| §14.3 properties P-1…P-10 (incl. P-8 stability) | `split.test.ts`, `balances.test.ts`, `money.test.ts` |
| TS ↔ SQL parity (equal split, balances) | `tests/integration/money-parity.test.ts` |
| §9.3 / §14.6 cross-household references rejected | `050_money_integrity.test.sql` |
| §9.5 share-sum invariant (deferred, commit path) | `050_money_integrity.test.sql`, `tests/integration/money-commit.test.ts` |
| §9.6 / §14.7 currency immutability | `050_money_integrity.test.sql` |
| §14.8 atomic household bootstrap + rollback | `030_create_household.test.sql` |
| §7.6–§7.8 / §14.9 invitation join under concurrency | `tests/integration/join-concurrency.test.ts` (lock-wait proof, 50 races, double submit) |
| §14.10 ALREADY_MEMBER consumes nothing | `040_invitations.test.sql` |
| §11.10 RLS matrix (A/C active, B other household, D former, E anonymized, anon) | `010_profiles_rls`, `021_households_rls`, `040_invitations`, `051_money_rpcs` |
| §11.7 RLS enabled on all exposed tables | `000_rls_enabled.test.sql` |
| §14.5 historical identity, anonymization, rejoin | `060_lifecycle.test.sql`, `e2e/lifecycle.spec.ts` |
| E2E-1 signup → create → invite → join | `e2e/invitations.spec.ts` |
| E2E-2 80 € / 4 → 20 € each → balances | `e2e/expenses.spec.ts`, `e2e/balances.spec.ts` |
| E2E-3 multiple payers → recommendations → settlement | `e2e/settlements.spec.ts` |
| E2E-4 other household's direct URL denied | `e2e/households.spec.ts` |
| §13.9 accessibility baseline (automated part) | `e2e/a11y.spec.ts` |

## Mutation checks performed

Each was applied temporarily and was caught by the suite, then reverted:

- Profile SELECT policy `using (true)` → profile isolation tests fail.
- `is_active_member` without the `status = 'active'` filter → former-member access tests fail.
- `join_household` without `FOR UPDATE` → all three concurrency tests fail.
- Inverted settlement signs (TS and SQL) → T1 and P-4 fail.
- Share-sum trigger disabled → integrity tests fail.

## Defect found and fixed during M1

The deferred share-sum trigger ran at COMMIT as `authenticated` and could not execute its check function, so every real expense write failed. pgTAP tests always roll back and never fired it. Fixed in migration `20261003081150`. Commit-path regression tests were added and shown to fail before the fix.

## Not covered by automation

- Manual accessibility review (screen reader, keyboard-only walkthrough).
- Behaviour on a hosted Supabase project (only the local stack was exercised).
- Real-user comprehension of balances: this is the purpose of T-0014.
