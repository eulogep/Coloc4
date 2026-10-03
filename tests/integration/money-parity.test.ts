// T-0008 — the SQL money rules must match the pure TypeScript domain exactly.
import { randomUUID } from 'node:crypto'
import { fc } from '@fast-check/vitest'
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { amountArb, ledgerArb, memberIdsArb } from '../../src/modules/expenses/domain/arbitraries'
import { computeBalances } from '../../src/modules/expenses/domain/balances'
import { splitEqual } from '../../src/modules/expenses/domain/split'
import { connect } from './db'

let db: pg.Client

beforeAll(async () => {
  db = await connect()
})

afterAll(async () => {
  await db?.end()
})

describe('TS ↔ SQL parity', () => {
  it('private.equal_split matches splitEqual (incl. uuid ordering)', async () => {
    await fc.assert(
      fc.asyncProperty(amountArb, memberIdsArb(1, 8), async (amount, members) => {
        const { rows } = await db.query<{ member_id: string; share: string }>(
          'select member_id::text, share_amount_minor::text as share from private.equal_split($1::bigint, $2::uuid[]) order by member_id',
          [amount.toString(), members],
        )
        const expected = splitEqual(amount, members)
        if (!expected.ok) throw new Error(expected.error)
        expect(rows.map((r) => ({ memberId: r.member_id, amountMinor: BigInt(r.share) }))).toEqual(expected.value)
      }),
      { numRuns: 300 },
    )
  })

  it('member_balances matches computeBalances on random ledgers', async () => {
    await fc.assert(
      fc.asyncProperty(ledgerArb, async ({ members, expenses, settlements }) => {
        await db.query('begin')
        try {
          const householdId = randomUUID()
          await db.query("insert into public.households (id, name, timezone) values ($1, 'Parité', 'Europe/Paris')", [
            householdId,
          ])
          // Anonymized members: valid without auth users, still part of the ledger.
          for (const [i, memberId] of members.entries()) {
            await db.query(
              `insert into public.household_members (id, household_id, user_id, display_name_snapshot, status, anonymized_at)
               values ($1, $2, null, $3, 'anonymized', now())`,
              [memberId, householdId, `Membre ${i + 1}`],
            )
          }
          const actor = members[0]!
          for (const e of expenses) {
            const expenseId = randomUUID()
            await db.query(
              `insert into public.expenses (id, household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on,
                                            created_by_member_id, deleted_at, deleted_by_member_id)
               values ($1, $2, 'Dépense', $3::bigint, $4, 'exact', current_date, $5,
                       case when $6 then now() end, case when $6 then $5::uuid end)`,
              [expenseId, householdId, e.amountMinor.toString(), e.paidBy, actor, e.deleted],
            )
            for (const s of e.shares) {
              await db.query(
                'insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor) values ($1, $2, $3, $4::bigint)',
                [expenseId, householdId, s.memberId, s.amountMinor.toString()],
              )
            }
          }
          for (const s of settlements) {
            await db.query(
              `insert into public.settlements (household_id, from_member_id, to_member_id, amount_minor, settled_on,
                                               created_by_member_id, deleted_at, deleted_by_member_id)
               values ($1, $2, $3, $4::bigint, current_date, $5, case when $6 then now() end, case when $6 then $5::uuid end)`,
              [householdId, s.from, s.to, s.amountMinor.toString(), actor, s.deleted],
            )
          }
          await db.query('set constraints all immediate') // share-sum trigger must accept the ledger

          const { rows } = await db.query<{ member_id: string; net_minor: string }>(
            'select member_id::text, net_minor from public.member_balances where household_id = $1 order by member_id',
            [householdId],
          )
          const expected = computeBalances(members, expenses, settlements)
          expect(rows.map((r) => ({ memberId: r.member_id, netMinor: BigInt(r.net_minor) }))).toEqual(expected)
        } finally {
          await db.query('rollback')
        }
      }),
      { numRuns: 60 },
    )
  })
})
