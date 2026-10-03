'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fr } from '@/i18n/fr'
import { authErrorMessage } from './errors'
import { safeNextPath } from './redirect'

export type AuthFormState = { error: string | null; info: string | null }

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    next: safeNextPath(formData.get('next')),
  }
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData)
  if (!email || !password) return { error: fr.auth.errors.missingFields, info: null }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: authErrorMessage(error.code), info: null }

  redirect(next)
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData)
  if (!email || !password) return { error: fr.auth.errors.missingFields, info: null }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: authErrorMessage(error.code), info: null }

  // With email confirmation enabled there is no session yet.
  if (!data.session) return { error: null, info: fr.auth.checkInbox }

  redirect(next)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/connexion')
}
