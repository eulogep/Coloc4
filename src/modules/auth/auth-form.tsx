'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { signIn, signUp, type AuthFormState } from './actions'

const initialState: AuthFormState = { error: null, info: null }

type Props = { mode: 'sign-in' | 'sign-up'; next?: string }

export function AuthForm({ mode, next }: Props) {
  const [state, formAction, pending] = useActionState(mode === 'sign-in' ? signIn : signUp, initialState)
  // Controlled fields: typed input survives a failed submission (§13.8).
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
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
      <TextField
        id="password"
        name="password"
        type="password"
        label={fr.auth.password}
        hint={mode === 'sign-up' ? fr.auth.passwordHint : undefined}
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        minLength={mode === 'sign-up' ? 8 : undefined}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormMessage error={state.error} info={state.info} />
      <SubmitButton
        pending={pending}
        label={mode === 'sign-in' ? fr.auth.signInSubmit : fr.auth.signUpSubmit}
        pendingLabel={mode === 'sign-in' ? fr.auth.signInPending : fr.auth.signUpPending}
      />
    </form>
  )
}
