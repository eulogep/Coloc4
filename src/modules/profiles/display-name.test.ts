import { describe, expect, it } from 'vitest'
import { normalizeDisplayName } from './display-name'

describe('normalizeDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeDisplayName('  Marie   José ')).toEqual({ ok: true, value: 'Marie José' })
  })

  it('rejects empty or blank names', () => {
    expect(normalizeDisplayName('')).toEqual({ ok: false, error: 'EMPTY' })
    expect(normalizeDisplayName('   ')).toEqual({ ok: false, error: 'EMPTY' })
  })

  it('accepts exactly 40 characters and rejects 41', () => {
    expect(normalizeDisplayName('a'.repeat(40)).ok).toBe(true)
    expect(normalizeDisplayName('a'.repeat(41))).toEqual({ ok: false, error: 'TOO_LONG' })
  })

  it('keeps accents', () => {
    expect(normalizeDisplayName('Zoé')).toEqual({ ok: true, value: 'Zoé' })
  })
})
