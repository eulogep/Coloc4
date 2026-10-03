'use server'

import { redirect } from 'next/navigation'
import { fr } from '@/i18n/fr'
import { requireUser } from '@/modules/auth/session'
import { normalizeDisplayName } from './display-name'

export type ProfileFormState = { error: string | null }

export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = normalizeDisplayName(String(formData.get('displayName') ?? ''))
  if (!parsed.ok) {
    return { error: parsed.error === 'EMPTY' ? fr.profile.errors.empty : fr.profile.errors.tooLong }
  }

  const { supabase, userId } = await requireUser()
  // Update first, insert if no profile exists yet. (An upsert would also try to
  // update user_id, which the column grants deliberately forbid.)
  const updated = await supabase
    .from('profiles')
    .update({ display_name: parsed.value })
    .eq('user_id', userId)
    .select('user_id')
  if (updated.error) return { error: fr.profile.errors.saveFailed }
  if (updated.data.length === 0) {
    const inserted = await supabase
      .from('profiles')
      .insert({ user_id: userId, display_name: parsed.value })
    if (inserted.error) return { error: fr.profile.errors.saveFailed }
  }

  redirect('/accueil')
}
