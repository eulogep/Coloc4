// T-0005 / Spike 4 — join_household under real concurrency (design §7.8, §13.4).
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { beginAs, connect, createHouseholdAs, createInvitationAs, createUserWithProfile } from './db'

let admin: pg.Client
let c1: pg.Client
let c2: pg.Client

beforeAll(async () => {
  ;[admin, c1, c2] = await Promise.all([connect(), connect(), connect()])
})

afterAll(async () => {
  await Promise.all([admin?.end(), c1?.end(), c2?.end()])
})

async function joinInTransaction(client: pg.Client, userId: string, token: string): Promise<string> {
  await beginAs(client, userId)
  try {
    const { rows } = await client.query<{ result_code: string }>(
      'select result_code from public.join_household($1)',
      [token],
    )
    await client.query('commit')
    return rows[0]!.result_code
  } catch (error) {
    await client.query('rollback')
    throw error
  }
}

async function readUseCount(invitationId: string): Promise<number> {
  const { rows } = await admin.query<{ use_count: number }>(
    'select use_count from public.household_invitations where id = $1',
    [invitationId],
  )
  return rows[0]!.use_count
}

async function setup(maxUses: number) {
  const owner = await createUserWithProfile(admin, 'Owner')
  const householdId = await createHouseholdAs(admin, owner)
  const invitation = await createInvitationAs(admin, owner, householdId, maxUses)
  return { householdId, invitation }
}

describe('join_household concurrency', () => {
  it('serializes on the invitation row: the waiting join sees the committed use_count', async () => {
    const { invitation } = await setup(1)
    const [x, y] = await Promise.all([createUserWithProfile(admin, 'X'), createUserWithProfile(admin, 'Y')])

    // X joins inside an open transaction and holds the invitation row lock.
    await beginAs(c1, x)
    const first = await c1.query<{ result_code: string }>('select result_code from public.join_household($1)', [
      invitation.token,
    ])
    expect(first.rows[0]!.result_code).toBe('JOINED')

    // Y's join must block on that lock.
    await beginAs(c2, y)
    const pending = c2.query<{ result_code: string }>('select result_code from public.join_household($1)', [
      invitation.token,
    ])
    await expect
      .poll(async () => {
        const { rows } = await admin.query<{ n: number }>(
          "select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query like '%join_household%'",
        )
        return rows[0]!.n
      })
      .toBe(1)

    await c1.query('commit')
    const second = await pending
    await c2.query('commit')

    expect(second.rows[0]!.result_code).toBe('EXHAUSTED')
    expect(await readUseCount(invitation.id)).toBe(1)
  })

  it('never grants two joins from one remaining use (50 races)', async () => {
    for (let i = 0; i < 50; i++) {
      const { invitation } = await setup(1)
      const [x, y] = await Promise.all([createUserWithProfile(admin, 'X'), createUserWithProfile(admin, 'Y')])

      const results = await Promise.all([
        joinInTransaction(c1, x, invitation.token),
        joinInTransaction(c2, y, invitation.token),
      ])

      expect(results.sort()).toEqual(['EXHAUSTED', 'JOINED'])
      expect(await readUseCount(invitation.id)).toBe(1)
    }
  })

  it('a double submit by the same user creates one membership and consumes one use', async () => {
    const { householdId, invitation } = await setup(10)
    const x = await createUserWithProfile(admin, 'X')

    const results = await Promise.all([
      joinInTransaction(c1, x, invitation.token),
      joinInTransaction(c2, x, invitation.token),
    ])

    expect(results.sort()).toEqual(['ALREADY_MEMBER', 'JOINED'])
    expect(await readUseCount(invitation.id)).toBe(1)
    const { rows } = await admin.query<{ n: number }>(
      'select count(*)::int as n from public.household_members where household_id = $1 and user_id = $2',
      [householdId, x],
    )
    expect(rows[0]!.n).toBe(1)
  })
})
