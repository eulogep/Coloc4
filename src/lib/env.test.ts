import { describe, expect, it } from 'vitest'
import { parsePublicEnv } from './env'

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54421',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
}

describe('parsePublicEnv', () => {
  it('returns the public configuration', () => {
    expect(parsePublicEnv(valid)).toEqual({
      supabaseUrl: 'http://127.0.0.1:54421',
      supabasePublishableKey: 'sb_publishable_test',
    })
  })

  it('rejects a missing URL', () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL',
    )
  })

  it('rejects an invalid URL', () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not a url' })).toThrow(
      'not a valid URL',
    )
  })

  it('rejects a missing key', () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }),
    ).toThrow('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  })

  it('refuses a secret key in the public variable', () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_oops' }),
    ).toThrow('contains a secret key')
  })
})
