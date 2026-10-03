// Public, browser-safe configuration only.
// The Supabase secret key must never be read from this module (ADR-003, §8.5).

export type PublicEnv = {
  supabaseUrl: string
  supabasePublishableKey: string
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const supabaseUrl = source.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!URL.canParse(supabaseUrl)) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
  if (!supabasePublishableKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  if (supabasePublishableKey.startsWith('sb_secret_')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contains a secret key')
  }

  return { supabaseUrl, supabasePublishableKey }
}

// Next.js inlines NEXT_PUBLIC_* only for static `process.env.X` accesses.
export function publicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}
