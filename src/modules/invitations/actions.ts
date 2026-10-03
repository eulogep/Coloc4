'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'
import { isJoinResultCode, isWellFormedToken, type JoinResultCode, type PreviewResultCode } from './codes'

export async function createInvitationLink(
  householdId: string,
): Promise<{ ok: true; token: string } | { ok: false }> {
  if (!isUuid(householdId)) return { ok: false }
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('create_invitation', { p_household_id: householdId })
  const token = data?.[0]?.token
  if (error || !token) return { ok: false }
  revalidatePath(`/colocations/${householdId}`)
  return { ok: true, token }
}

export async function revokeInvitation(householdId: string, invitationId: string): Promise<{ ok: boolean }> {
  if (!isUuid(householdId) || !isUuid(invitationId)) return { ok: false }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('revoke_invitation', { p_invitation_id: invitationId })
  if (error) return { ok: false }
  revalidatePath(`/colocations/${householdId}`)
  return { ok: true }
}

export type PreviewOutcome =
  | { code: 'AUTH_REQUIRED' | 'PROFILE_REQUIRED' | 'ERROR' }
  | { code: 'INVALID' }
  | { code: PreviewResultCode; householdName: string | null; householdId: string | null }

// Not using requireUser(): an anonymous visitor gets AUTH_REQUIRED instead of a redirect.
export async function previewInvitation(token: string): Promise<PreviewOutcome> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims?.sub
  if (!userId) return { code: 'AUTH_REQUIRED' }
  if (!isWellFormedToken(token)) return { code: 'INVALID' }

  const profile = await supabase.from('profiles').select('user_id').eq('user_id', userId).maybeSingle()
  if (profile.error) return { code: 'ERROR' }
  if (!profile.data) return { code: 'PROFILE_REQUIRED' }

  const { data, error } = await supabase.rpc('preview_invitation', { p_token: token })
  const row = data?.[0]
  if (error || !row) return { code: 'ERROR' }
  return {
    code: row.result_code as PreviewResultCode,
    householdName: row.household_name,
    householdId: row.target_household_id,
  }
}

export type JoinOutcome =
  | { code: JoinResultCode; householdId: string | null }
  | { code: 'AUTH_REQUIRED' | 'PROFILE_REQUIRED' | 'ERROR'; householdId: null }

export async function joinWithInvitation(token: string): Promise<JoinOutcome> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims?.sub) return { code: 'AUTH_REQUIRED', householdId: null }
  if (!isWellFormedToken(token)) return { code: 'INVALID', householdId: null }

  const { data, error } = await supabase.rpc('join_household', { p_token: token })
  if (error?.message === 'PROFILE_REQUIRED') return { code: 'PROFILE_REQUIRED', householdId: null }
  const row = data?.[0]
  if (error || !row || !isJoinResultCode(row.result_code)) return { code: 'ERROR', householdId: null }
  return { code: row.result_code, householdId: row.target_household_id }
}
