import 'server-only'
import { cache } from 'react'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'
import type { Database } from '@/lib/supabase/database.types'

type MemberRole = Database['public']['Enums']['member_role']
type MemberStatus = Database['public']['Enums']['member_status']

export type HouseholdSummary = { id: string; name: string }

export type HouseholdMember = {
  id: string
  displayName: string
  role: MemberRole
  status: MemberStatus
  isMe: boolean
}

export type HouseholdDetail = HouseholdSummary & {
  timezone: string
  myMemberId: string
  members: HouseholdMember[]
}

// RLS returns only households where the caller is an active member.
export async function listMyHouseholds(): Promise<HouseholdSummary[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('households')
    .select('id, name')
    .is('archived_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

// null = not found or not an active member (indistinguishable on purpose).
// Cached per request: the household layout and its pages share one lookup.
export const getHousehold = cache(async (householdId: string): Promise<HouseholdDetail | null> => {
  if (!isUuid(householdId)) return null
  const { supabase, userId } = await requireUser()

  const [household, members] = await Promise.all([
    supabase.from('households').select('id, name, timezone').eq('id', householdId).is('archived_at', null).maybeSingle(),
    supabase
      .from('household_members')
      .select('id, user_id, display_name_snapshot, role, status, joined_at')
      .eq('household_id', householdId)
      .order('joined_at'),
  ])
  if (household.error) throw household.error
  if (members.error) throw members.error
  if (!household.data) return null

  const me = members.data.find((m) => m.user_id === userId && m.status === 'active')
  if (!me) return null

  return {
    ...household.data,
    myMemberId: me.id,
    members: members.data.map((m) => ({
      id: m.id,
      displayName: m.display_name_snapshot,
      role: m.role,
      status: m.status,
      isMe: m.id === me.id,
    })),
  }
})
