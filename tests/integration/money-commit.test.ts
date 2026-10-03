// Regression (T-0009): money RPCs must COMMIT as an authenticated user. pgTAP rolls
// back, so deferred constraint triggers are only exercised here.
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { beginAs, connect, createHouseholdAs, createUserWithProfile } from './db'

let admin: pg.Client
let client: pg.Client

beforeAll(async () => {
  ;[admin, client] = await Promise.all([connect(), connect()])
})

afterAll(async () => {
  await Promise.all([admin?.end(), client?.end()])
})

describe('money RPCs commit as authenticated', () => {
  it('create, update, delete an expense and record a settlement', async () => {
    const alice = await createUserWithProfile(admin, 'Alice')
    const householdId = await createHouseholdAs(admin, alice)
    const { rows: members } = await admin.query<{ id: string }>(
      'select id from public.household_members where household_id = $1',
      [householdId],
    )
    const me = members[0]!.id

    await beginAs(client, alice)
    const created = await client.query<{ id: string }>(
      `select public.create_expense($1, 'Courses', '8000', $2, 'equal', current_date, $3::jsonb) as id`,
      [householdId, me, JSON.stringify([me])],
    )
    await client.query('commit')
    const expenseId = created.rows[0]!.id

    await beginAs(client, alice)
    await client.query(
      `select public.update_expense($1, 'Courses', '9000', $2, 'exact', current_date, $3::jsonb)`,
      [expenseId, me, JSON.stringify([{ memberId: me, amountMinor: '9000' }])],
    )
    await client.query('commit')

    await beginAs(client, alice)
    await client.query('select public.delete_expense($1)', [expenseId])
    await client.query('commit')

    const { rows } = await admin.query<{ amount: string; deleted: boolean }>(
      'select amount_minor::text as amount, deleted_at is not null as deleted from public.expenses where id = $1',
      [expenseId],
    )
    expect(rows[0]).toEqual({ amount: '9000', deleted: true })
  })

  it('an inconsistent direct write is still rejected at commit', async () => {
    const alice = await createUserWithProfile(admin, 'Alice')
    const householdId = await createHouseholdAs(admin, alice)
    const { rows: members } = await admin.query<{ id: string }>(
      'select id from public.household_members where household_id = $1',
      [householdId],
    )
    await admin.query('begin')
    await admin.query(
      `insert into public.expenses (household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on, created_by_member_id)
       values ($1, 'Sans parts', 100, $2, 'exact', current_date, $2)`,
      [householdId, members[0]!.id],
    )
    await expect(admin.query('commit')).rejects.toThrow(/EXPENSE_SHARES_MISMATCH/)
  })
})
