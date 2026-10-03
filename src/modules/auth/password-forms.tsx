'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { requestPasswordReset, updatePassword, type AuthFormState, type ResetState } from './actions'

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, { error: null, sent: false } as ResetState)
  const [email, setEmail] = useState('')
  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <TextField
        id="email"
        name="email"
        type="email"
        label={fr.auth.email}
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormMessage error={state.error} info={state.sent ? fr.passwordReset.sent : null} />
      <SubmitButton pending={pending} label={fr.passwordReset.submit} pendingLabel={fr.passwordReset.pending} />
    </form>
  )
}

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, { error: null, info: null } as AuthFormState)
  const [password, setPassword] = useState('')
  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <TextField
        id="password"
        name="password"
        type="password"
        label={fr.passwordReset.newPassword}
        hint={fr.auth.passwordHint}
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending} label={fr.passwordReset.save} pendingLabel={fr.passwordReset.saving} />
    </form>
  )
}
