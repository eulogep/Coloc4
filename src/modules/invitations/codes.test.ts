import { describe, expect, it } from 'vitest'
import { isJoinResultCode, isWellFormedToken } from './codes'

describe('invitation codes', () => {
  it('recognizes join result codes', () => {
    expect(isJoinResultCode('JOINED')).toBe(true)
    expect(isJoinResultCode('VALID')).toBe(false)
    expect(isJoinResultCode(undefined)).toBe(false)
  })

  it('validates token shape', () => {
    expect(isWellFormedToken('a'.repeat(43))).toBe(true)
    expect(isWellFormedToken('a'.repeat(42))).toBe(false)
    expect(isWellFormedToken(`${'a'.repeat(42)}+`)).toBe(false)
  })
})
