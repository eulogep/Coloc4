'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/modules/auth/session'
import { createHouseholdErrorMessage } from './errors'

export type CreateHouseholdState = { error: string | null }

const FALLBACK_TIMEZONE = 'Europe/Paris'

export async function createHousehold(
  _prev: CreateHouseholdState,
  formData: FormData,
): Promise<CreateHouseholdState> {
  const name = String(formData.get('name') ?? '')
  const browserTimezone = String(formData.get('timezone') ?? '') || FALLBACK_TIMEZONE
  const { supabase } = await requireUser()

  let result = await supabase.rpc('create_household', { p_name: name, p_timezone: browserTimezone })
  // The browser's zone is a convenience, not user input worth failing on.
  if (result.error?.message === 'INVALID_TIMEZONE' && browserTimezone !== FALLBACK_TIMEZONE) {
    result = await supabase.rpc('create_household', { p_name: name, p_timezone: FALLBACK_TIMEZONE })
  }
  if (result.error) return { error: createHouseholdErrorMessage(result.error.message) }

  redirect(`/colocations/${result.data}`)
}
