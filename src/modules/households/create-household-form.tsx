'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { createHousehold, type CreateHouseholdState } from './actions'

const initialState: CreateHouseholdState = { error: null }

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

export function CreateHouseholdForm() {
  const [state, formAction, pending] = useActionState(createHousehold, initialState)
  const [name, setName] = useState('')

  return (
    <form
      action={(formData) => {
        // Read at submit time: during server rendering this would be the server's zone.
        formData.set('timezone', browserTimezone())
        formAction(formData)
      }}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <TextField
        id="name"
        name="name"
        label={fr.households.name}
        hint={fr.households.nameHint}
        maxLength={60}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending} label={fr.households.submit} pendingLabel={fr.households.pending} />
    </form>
  )
}
