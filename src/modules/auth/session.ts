import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Verified identity for the current request. getClaims() validates the JWT;
// the user id always comes from here, never from client input.
export const requireUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect('/connexion')
  return { supabase, userId }
})
