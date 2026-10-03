import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { amountArb } from './arbitraries'
import { formatEur, minorFromWire, minorToWire, parseEurAmount, toInputString } from './money'

describe('parseEurAmount', () => {
  it.each([
    ['42.37', 4237n],
    ['42,37', 4237n],
    ['80', 8000n],
    ['3.5', 350n],
    ['3,5', 350n],
    ['3,', 300n],
    [' 12,00 ', 1200n],
    ['0,01', 1n],
    ['007', 700n],
    ['1000000', 100_000_000n],
  ])('%s → %s', (input, expected) => {
    expect(parseEurAmount(input)).toEqual({ ok: true, value: expected })
  })

  it.each([
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
    ['3.456', 'TOO_MANY_DECIMALS'],
    ['3,456', 'TOO_MANY_DECIMALS'],
    ['abc', 'NOT_A_NUMBER'],
    ['-5', 'NOT_A_NUMBER'],
    ['+5', 'NOT_A_NUMBER'],
    ['1 000', 'NOT_A_NUMBER'],
    ['1.000,50', 'NOT_A_NUMBER'],
    ['1e3', 'NOT_A_NUMBER'],
    [',5', 'NOT_A_NUMBER'],
    ['12 €', 'NOT_A_NUMBER'],
    ['0', 'NOT_POSITIVE'],
    ['0,00', 'NOT_POSITIVE'],
    ['1000000,01', 'TOO_LARGE'],
    ['99999999999999999999', 'TOO_LARGE'],
  ])('rejects %j with %s', (input, error) => {
    expect(parseEurAmount(input)).toEqual({ ok: false, error })
  })
})

describe('formatEur', () => {
  it('formats French euros', () => {
    expect(formatEur(4237n)).toBe('42,37 €')
    expect(formatEur(1n)).toBe('0,01 €')
    expect(formatEur(0n)).toBe('0,00 €')
    expect(formatEur(123456789n)).toBe('1 234 567,89 €')
    expect(formatEur(-1850n)).toBe('-18,50 €')
  })
})

describe('wire format', () => {
  it('round-trips through strings', () => {
    expect(minorToWire(4237n)).toBe('4237')
    expect(minorFromWire('4237')).toBe(4237n)
    expect(minorFromWire('-20')).toBe(-20n)
    expect(minorFromWire('9007199254740993')).toBe(9007199254740993n) // beyond Number.MAX_SAFE_INTEGER
  })

  it.each(['', '42.37', '1e3', ' 1', '01', '--1', 'abc'])('rejects %j', (wire) => {
    expect(() => minorFromWire(wire)).toThrow(TypeError)
  })
})

describe('properties', () => {
  test.prop([amountArb])('P-10: parse(format input) round-trips', (amount) => {
    expect(parseEurAmount(toInputString(amount))).toEqual({ ok: true, value: amount })
  })

  test.prop([fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n })])('wire round-trips any bigint', (amount) => {
    expect(minorFromWire(minorToWire(amount))).toBe(amount)
  })
})
