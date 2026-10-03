'use server'

import { headers } from 'next/headers'
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
  const origin = await requestOrigin()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Becomes {{ .RedirectTo }} in the confirmation email (must be allow-listed in Supabase Auth).
    options: origin ? { emailRedirectTo: `${origin}${next}` } : undefined,
  })
  if (error) return { error: authErrorMessage(error.code), info: null }

  // With email confirmation enabled there is no session yet.
  if (!data.session) {
    const info = next === '/rejoindre' ? `${fr.auth.checkInbox} ${fr.auth.checkInboxJoin}` : fr.auth.checkInbox
    return { error: null, info }
  }

  redirect(next)
}

// Origin of the current request (Server Actions always carry it); used for email links.
async function requestOrigin(): Promise<string | null> {
  const origin = (await headers()).get('origin')
  return origin && URL.canParse(origin) ? new URL(origin).origin : null
}

export type ResetState = { error: string | null; sent: boolean }

/** Always answers the same way, whether or not the account exists (no enumeration). */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: fr.auth.errors.missingFields, sent: false }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error?.code === 'over_request_rate_limit' || error?.code === 'over_email_send_rate_limit') {
    return { error: fr.auth.errors.rateLimited, sent: false }
  }
  return { error: null, sent: true }
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get('password') ?? '')
  if (!password) return { error: fr.auth.errors.missingFields, info: null }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: authErrorMessage(error.code), info: null }
  redirect('/accueil')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/connexion')
}
