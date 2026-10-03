import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

// Browser client: publishable key only, every query goes through RLS.
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv()
  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}
