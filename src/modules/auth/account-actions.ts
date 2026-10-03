'use server'

import { redirect } from 'next/navigation'
import { fr } from '@/i18n/fr'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from './session'

export type DeleteAccountState = { error: string | null }

/**
 * Anonymizes every membership, deletes the profile and the auth account in one
 * database transaction (delete_my_account), then clears this browser's session.
 */
export async function deleteMyAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  if (String(formData.get('confirmation') ?? '').trim() !== fr.account.deleteConfirmWord) {
    return { error: fr.account.errors.CONFIRMATION }
  }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    return {
      error: error.message === 'OWNER_MUST_TRANSFER' ? fr.account.errors.OWNER_MUST_TRANSFER : fr.account.errors.UNKNOWN,
    }
  }

  // The account no longer exists: only local cookies need clearing.
  const client = await createClient()
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  redirect('/?compte=supprime')
}
