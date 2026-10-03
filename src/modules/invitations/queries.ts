import 'server-only'
import { requireUser } from '@/modules/auth/session'

export type ActiveInvitation = { id: string; useCount: number; maxUses: number; expiresAt: string }

// token_hash is never selected (column grant forbids it anyway).
export async function listActiveInvitations(householdId: string): Promise<ActiveInvitation[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('household_invitations')
    .select('id, use_count, max_uses, expires_at')
    .eq('household_id', householdId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
    .filter((i) => i.use_count < i.max_uses)
    .map((i) => ({ id: i.id, useCount: i.use_count, maxUses: i.max_uses, expiresAt: i.expires_at }))
}
