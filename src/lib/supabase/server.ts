import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

// User-scoped client for Server Components, Server Actions and Route Handlers.
// Create one per request; never share it.
export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabasePublishableKey } = publicEnv()

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  })
}
