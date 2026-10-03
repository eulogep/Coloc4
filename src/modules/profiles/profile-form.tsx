'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { saveProfile, type ProfileFormState } from './actions'
import { DISPLAY_NAME_MAX_LENGTH } from './display-name'

const initialState: ProfileFormState = { error: null }

export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState)
  const [displayName, setDisplayName] = useState(initialDisplayName)

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <TextField
        id="displayName"
        name="displayName"
        label={fr.profile.displayName}
        hint={fr.profile.displayNameHint}
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending} label={fr.profile.submit} pendingLabel={fr.profile.pending} />
    </form>
  )
}
