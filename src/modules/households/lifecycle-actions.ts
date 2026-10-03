'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fr } from '@/i18n/fr'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'

type LifecycleError = keyof typeof fr.lifecycle.errors
const message = (code: string | undefined) =>
  code && code in fr.lifecycle.errors
    ? fr.lifecycle.errors[code as LifecycleError]
    : fr.lifecycle.errors.UNKNOWN

export async function leaveHousehold(householdId: string): Promise<{ error: string | null }> {
  if (!isUuid(householdId)) return { error: message('UNKNOWN') }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('leave_household', { p_household_id: householdId })
  if (error) return { error: message(error.message) }
  redirect('/accueil')
}

export async function transferOwnership(householdId: string, toMemberId: string): Promise<{ error: string | null }> {
  if (!isUuid(householdId) || !isUuid(toMemberId)) return { error: message('INVALID_MEMBER') }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('transfer_ownership', { p_household_id: householdId, p_to_member_id: toMemberId })
  if (error) return { error: message(error.message) }
  revalidatePath(`/colocations/${householdId}`, 'layout')
  return { error: null }
}

export async function archiveHousehold(householdId: string): Promise<{ error: string | null }> {
  if (!isUuid(householdId)) return { error: message('UNKNOWN') }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('archive_household', { p_household_id: householdId })
  if (error) return { error: message(error.message) }
  redirect('/accueil')
}
