import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

// Browser client: publishable key only, every query goes through RLS.
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv()
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey)
}
