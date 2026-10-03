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

  it('delete_my_account commits as the authenticated user and keeps the books', async () => {
    const alice = await createUserWithProfile(admin, 'Alice')
    const bob = await createUserWithProfile(admin, 'Bob')
    const householdId = await createHouseholdAs(admin, alice)
    await beginAs(client, alice)
    const { rows: inv } = await client.query<{ token: string }>('select token from public.create_invitation($1)', [householdId])
    await client.query('commit')
    await beginAs(client, bob)
    await client.query('select * from public.join_household($1)', [inv[0]!.token])
    await client.query('commit')

    const { rows: members } = await admin.query<{ id: string; user_id: string }>(
      'select id, user_id::text from public.household_members where household_id = $1',
      [householdId],
    )
    const ids = members.map((m) => m.id)
    const bobMember = members.find((m) => m.user_id === bob)!.id
    await beginAs(client, bob)
    await client.query(
      `select public.create_expense($1, 'Courses', '3000', $2, 'equal', current_date, $3::jsonb)`,
      [householdId, bobMember, JSON.stringify(ids)],
    )
    await client.query('commit')

    await beginAs(client, bob)
    await client.query('select public.delete_my_account()')
    await client.query('commit')

    const { rows } = await admin.query<{ name: string; status: string; net: string; users: string }>(
      `select m.display_name_snapshot as name, m.status::text, private.member_net(m.household_id, m.id)::text as net,
              (select count(*)::text from auth.users where id = $2) as users
       from public.household_members m where m.id = $1`,
      [bobMember, bob],
    )
    expect(rows[0]).toEqual({ name: 'Ancien colocataire 1', status: 'anonymized', net: '1500', users: '0' })
  })
})

