'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { TextField } from '@/components/ui/text-field'
import { deleteMyAccount, type DeleteAccountState } from './account-actions'

const initialState: DeleteAccountState = { error: null }

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteMyAccount, initialState)
  const [confirmation, setConfirmation] = useState('')

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TextField
        id="confirmation"
        name="confirmation"
        label={fr.account.deleteConfirmLabel}
        autoComplete="off"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
      <FormMessage error={state.error} />
      <button
        type="submit"
        disabled={pending || confirmation.trim() !== fr.account.deleteConfirmWord}
        className="min-h-12 rounded-full bg-red-700 px-6 font-medium text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {pending ? fr.account.deleting : fr.account.delete}
      </button>
    </form>
  )
}
