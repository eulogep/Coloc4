import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { amountArb, memberIdsArb } from './arbitraries'
import { compareMemberId } from './member-id'
import { remainingToSplit, splitEqual, sumShares, validateExactSplit } from './split'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const D = '00000000-0000-4000-8000-00000000000d'

describe('splitEqual', () => {
  it('1000 / 3 → 334, 333, 333 in member-id order (§4.5)', () => {
    expect(splitEqual(1000n, [C, A, B])).toEqual({
      ok: true,
      value: [
        { memberId: A, amountMinor: 334n },
        { memberId: B, amountMinor: 333n },
        { memberId: C, amountMinor: 333n },
      ],
    })
  })

  it('80 € between 4 → 20 € each (E2E-2)', () => {
    const result = splitEqual(8000n, [A, B, C, D])
    expect(result.ok && result.value.map((s) => s.amountMinor)).toEqual([2000n, 2000n, 2000n, 2000n])
  })

  it('1 cent between 3 → one participant gets it', () => {
    const result = splitEqual(1n, [A, B, C])
    expect(result.ok && result.value.map((s) => s.amountMinor)).toEqual([1n, 0n, 0n])
  })

  it('orders uuids by bytes, not by locale', () => {
    // 'a' (0x61) sorts after '9' (0x39) in byte order.
    const nine = '90000000-0000-4000-8000-000000000000'
    const a = 'a0000000-0000-4000-8000-000000000000'
    const result = splitEqual(1n, [a, nine])
    expect(result.ok && result.value[0]!.memberId).toBe(nine)
  })

  it.each([
    [0n, [A], 'NOT_POSITIVE_AMOUNT'],
    [-5n, [A], 'NOT_POSITIVE_AMOUNT'],
    [100n, [], 'NO_PARTICIPANT'],
    [100n, [A, A], 'DUPLICATE_PARTICIPANT'],
    [100n, [A, A.toUpperCase()], 'DUPLICATE_PARTICIPANT'],
  ] as const)('rejects amount %s with %j', (amount, participants, error) => {
    expect(splitEqual(amount, participants)).toEqual({ ok: false, error })
  })
})

describe('validateExactSplit', () => {
  it('accepts shares summing to the amount, including zero shares', () => {
    const shares = [
      { memberId: B, amountMinor: 700n },
      { memberId: A, amountMinor: 300n },
      { memberId: C, amountMinor: 0n },
    ]
    expect(validateExactSplit(1000n, shares)).toEqual({
      ok: true,
      value: [shares[1], shares[0], shares[2]],
    })
  })

  it.each([
    [1000n, [{ memberId: A, amountMinor: 999n }], 'SUM_MISMATCH'],
    [1000n, [{ memberId: A, amountMinor: 1001n }], 'SUM_MISMATCH'],
    [1000n, [{ memberId: A, amountMinor: 1100n }, { memberId: B, amountMinor: -100n }], 'NEGATIVE_SHARE'],
    [1000n, [{ memberId: A, amountMinor: 0n }], 'ALL_ZERO'],
    [1000n, [], 'NO_PARTICIPANT'],
    [1000n, [{ memberId: A, amountMinor: 500n }, { memberId: A, amountMinor: 500n }], 'DUPLICATE_PARTICIPANT'],
    [0n, [{ memberId: A, amountMinor: 0n }], 'NOT_POSITIVE_AMOUNT'],
  ] as const)('rejects invalid exact split #%#', (amount, shares, error) => {
    expect(validateExactSplit(amount, shares)).toEqual({ ok: false, error })
  })

  it('reports what is left to split', () => {
    expect(remainingToSplit(1000n, [{ memberId: A, amountMinor: 680n }])).toBe(320n)
    expect(remainingToSplit(1000n, [{ memberId: A, amountMinor: 1200n }])).toBe(-200n)
  })
})

describe('properties', () => {
  test.prop([amountArb, memberIdsArb(1, 8)], { numRuns: 2000 })(
    'P-1: equal shares sum to the amount, differ by at most 1 cent, extras go first',
    (amount, members) => {
      const result = splitEqual(amount, members)
      if (!result.ok) throw new Error(result.error)
      const shares = result.value
      const n = BigInt(members.length)
      expect(sumShares(shares)).toBe(amount)
      for (const [i, s] of shares.entries()) {
        expect(s.amountMinor).toBe(amount / n + (BigInt(i) < amount % n ? 1n : 0n))
      }
      const ids = shares.map((s) => s.memberId)
      expect(ids).toEqual([...ids].sort(compareMemberId))
    },
  )

  test.prop([amountArb, memberIdsArb(1, 8)])('P-7: equal split ignores input order', (amount, members) => {
    expect(splitEqual(amount, [...members].reverse())).toEqual(splitEqual(amount, members))
  })

  test.prop([amountArb, memberIdsArb(1, 8)])('P-2: an equal split is a valid exact split', (amount, members) => {
    const result = splitEqual(amount, members)
    if (!result.ok) throw new Error(result.error)
    expect(validateExactSplit(amount, result.value).ok).toBe(true)
  })

  test.prop([amountArb, memberIdsArb(1, 8), fc.bigInt({ min: 1n, max: 1000n })])(
    'P-2: any deviation from the sum is rejected',
    (amount, members, delta) => {
      const result = splitEqual(amount, members)
      if (!result.ok) throw new Error(result.error)
      const [first, ...rest] = result.value
      const tampered = [{ ...first!, amountMinor: first!.amountMinor + delta }, ...rest]
      expect(validateExactSplit(amount, tampered)).toEqual({ ok: false, error: 'SUM_MISMATCH' })
    },
  )
})
