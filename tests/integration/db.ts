import { randomUUID } from 'node:crypto'
import pg from 'pg'

// Direct Postgres access to the local Supabase stack (never production).
export const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54422/postgres'

export async function connect(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  return client
}

// Starts a transaction acting as `userId`, exactly like a PostgREST request would.
export async function beginAs(client: pg.Client, userId: string): Promise<void> {
  await client.query('begin')
  await client.query("select set_config('role', 'authenticated', true)")
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ])
}

export async function createUserWithProfile(admin: pg.Client, displayName: string): Promise<string> {
  const id = randomUUID()
  await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '{}', '{}', now(), now())`,
    [id, `it-${id}@test.local`],
  )
  await admin.query('insert into public.profiles (user_id, display_name) values ($1, $2)', [id, displayName])
  return id
}

export async function createHouseholdAs(client: pg.Client, ownerId: string): Promise<string> {
  await beginAs(client, ownerId)
  const { rows } = await client.query<{ id: string }>(
    "select public.create_household('Coloc concurrence', 'Europe/Paris') as id",
  )
  await client.query('commit')
  return rows[0]!.id
}

export async function createInvitationAs(
  client: pg.Client,
  memberUserId: string,
  householdId: string,
  maxUses: number,
): Promise<{ id: string; token: string }> {
  await beginAs(client, memberUserId)
  const { rows } = await client.query<{ invitation_id: string; token: string }>(
    'select invitation_id, token from public.create_invitation($1)',
    [householdId],
  )
  await client.query('commit')
  const invitation = rows[0]!
  await client.query('update public.household_invitations set max_uses = $2 where id = $1', [
    invitation.invitation_id,
    maxUses,
  ])
  return { id: invitation.invitation_id, token: invitation.token }
}
