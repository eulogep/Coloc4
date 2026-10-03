import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { balancesArb, ledgerArb } from './arbitraries'
import {
  computeBalances,
  explainBalance,
  LedgerError,
  sumNets,
  type LedgerExpense,
  type LedgerSettlement,
  type MemberBalance,
} from './balances'
import { recommendSettlements, type SettlementRecommendation } from './settlements'
import { splitEqual } from './split'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const D = '00000000-0000-4000-8000-00000000000d'

let seq = 0
const id = () => `id-${++seq}`

function equalExpense(paidBy: string, amountMinor: bigint, participants: string[], deleted = false): LedgerExpense {
  const split = splitEqual(amountMinor, participants)
  if (!split.ok) throw new Error(split.error)
  return { id: id(), paidBy, amountMinor, shares: split.value, deleted }
}

const settlement = (from: string, to: string, amountMinor: bigint, deleted = false): LedgerSettlement => ({
  id: id(),
  from,
  to,
  amountMinor,
  deleted,
})

const net = (balances: MemberBalance[], memberId: string) => balances.find((b) => b.memberId === memberId)!.netMinor

const asSettlements = (recs: SettlementRecommendation[]): LedgerSettlement[] =>
  recs.map((r) => settlement(r.fromMemberId, r.toMemberId, r.amountMinor))

describe('computeBalances', () => {
  it('T1 (mandatory, §4.8): B reimbursing A 20 € settles both to 0', () => {
    // A paid 40 € for A and B → A = +20 €, B = −20 €
    const expenses = [equalExpense(A, 4000n, [A, B])]
    const before = computeBalances([A, B], expenses, [])
    expect(net(before, A)).toBe(2000n)
    expect(net(before, B)).toBe(-2000n)

    const after = computeBalances([A, B], expenses, [settlement(B, A, 2000n)])
    expect(net(after, A)).toBe(0n)
    expect(net(after, B)).toBe(0n)
  })

  it('E2E-2: 80 € paid by A between 4 → A +60 €, others −20 €', () => {
    const balances = computeBalances([A, B, C, D], [equalExpense(A, 8000n, [A, B, C, D])], [])
    expect(balances.map((b) => b.netMinor)).toEqual([6000n, -2000n, -2000n, -2000n])
  })

  it('payer who does not participate is owed the full amount', () => {
    const balances = computeBalances([A, B, C], [equalExpense(A, 3000n, [B, C])], [])
    expect(balances.map((b) => b.netMinor)).toEqual([3000n, -1500n, -1500n])
  })

  it('multiple payers, exact split and a zero-balance member', () => {
    const expenses: LedgerExpense[] = [
      equalExpense(A, 9000n, [A, B, C]),
      {
        id: id(),
        paidBy: B,
        amountMinor: 1000n,
        shares: [
          { memberId: A, amountMinor: 700n },
          { memberId: B, amountMinor: 300n },
        ],
        deleted: false,
      },
    ]
    const balances = computeBalances([A, B, C, D], expenses, [])
    expect(balances.map((b) => b.netMinor)).toEqual([5300n, -2300n, -3000n, 0n])
  })

  it('circular debts cancel out', () => {
    const expenses = [equalExpense(A, 2000n, [B]), equalExpense(B, 2000n, [C]), equalExpense(C, 2000n, [A])]
    const balances = computeBalances([A, B, C], expenses, [])
    expect(balances.every((b) => b.netMinor === 0n)).toBe(true)
    expect(recommendSettlements(balances)).toEqual([])
  })

  it('partial settlement leaves the remainder', () => {
    const balances = computeBalances([A, B], [equalExpense(A, 4000n, [A, B])], [settlement(B, A, 500n)])
    expect(net(balances, A)).toBe(1500n)
    expect(net(balances, B)).toBe(-1500n)
  })

  it('soft-deleted expenses and settlements are ignored; an edit replaces the shares', () => {
    const original = equalExpense(A, 3000n, [A, B, C], true) // replaced by the edit below
    const edited = equalExpense(A, 3300n, [A, B, C])
    const balances = computeBalances([A, B, C], [original, edited], [settlement(B, A, 1100n, true)])
    expect(balances.map((b) => b.netMinor)).toEqual([2200n, -1100n, -1100n])
  })

  it('a former member keeps their balance and can settle it', () => {
    // D left after sharing an expense; history and balance are unchanged.
    const expenses = [equalExpense(A, 4000n, [A, D])]
    expect(net(computeBalances([A, B, D], expenses, []), D)).toBe(-2000n)
    expect(net(computeBalances([A, B, D], expenses, [settlement(D, A, 2000n)]), D)).toBe(0n)
  })

  it('works for 8 members', () => {
    const members = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`)
    const balances = computeBalances(members, [equalExpense(members[0]!, 1000n, members)], [])
    expect(sumNets(balances)).toBe(0n)
    expect(balances.map((b) => b.netMinor)).toEqual([875n, -125n, -125n, -125n, -125n, -125n, -125n, -125n])
  })

  it('rejects a ledger referencing an unknown member', () => {
    expect(() => computeBalances([A], [equalExpense(A, 100n, [A, B])], [])).toThrow(LedgerError)
  })
})

describe('explainBalance', () => {
  it('lists the lines behind a balance', () => {
    const e1 = equalExpense(A, 4000n, [A, B])
    const s1 = settlement(B, A, 500n)
    expect(explainBalance(B, [e1], [s1])).toEqual([
      { kind: 'expense', id: e1.id, paidMinor: 0n, shareMinor: 2000n, deltaMinor: -2000n },
      { kind: 'settlement_sent', id: s1.id, deltaMinor: 500n },
    ])
  })
})

describe('recommendSettlements', () => {
  it('matches largest debtor with largest creditor', () => {
    const recs = recommendSettlements([
      { memberId: A, netMinor: 6000n },
      { memberId: B, netMinor: -2000n },
      { memberId: C, netMinor: -3000n },
      { memberId: D, netMinor: -1000n },
    ])
    expect(recs).toEqual([
      { fromMemberId: C, toMemberId: A, amountMinor: 3000n },
      { fromMemberId: B, toMemberId: A, amountMinor: 2000n },
      { fromMemberId: D, toMemberId: A, amountMinor: 1000n },
    ])
  })

  it('breaks ties by member id', () => {
    const recs = recommendSettlements([
      { memberId: D, netMinor: -1000n },
      { memberId: C, netMinor: 1000n },
      { memberId: B, netMinor: -1000n },
      { memberId: A, netMinor: 1000n },
    ])
    expect(recs).toEqual([
      { fromMemberId: B, toMemberId: A, amountMinor: 1000n },
      { fromMemberId: D, toMemberId: C, amountMinor: 1000n },
    ])
  })

  it('refuses balances that do not sum to zero', () => {
    expect(() => recommendSettlements([{ memberId: A, netMinor: 1n }])).toThrow(LedgerError)
  })
})

describe('properties', () => {
  test.prop([ledgerArb], { numRuns: 500 })('P-3: nets always sum to zero', ({ members, expenses, settlements }) => {
    expect(sumNets(computeBalances(members, expenses, settlements))).toBe(0n)
  })

  test.prop([ledgerArb], { numRuns: 300 })('explanation lines sum to the net', ({ members, expenses, settlements }) => {
    for (const b of computeBalances(members, expenses, settlements)) {
      const lines = explainBalance(b.memberId, expenses, settlements)
      expect(lines.reduce((t, l) => t + l.deltaMinor, 0n)).toBe(b.netMinor)
    }
  })

  test.prop([ledgerArb], { numRuns: 500 })(
    'P-4: recording every recommendation settles everyone',
    ({ members, expenses, settlements }) => {
      const recs = recommendSettlements(computeBalances(members, expenses, settlements))
      const after = computeBalances(members, expenses, [...settlements, ...asSettlements(recs)])
      expect(after.every((b) => b.netMinor === 0n)).toBe(true)
    },
  )

  test.prop([balancesArb], { numRuns: 1000 })('P-5, P-6: ≤ n−1 positive transfers, never to self', (balances) => {
    const recs = recommendSettlements(balances)
    const nonZero = balances.filter((b) => b.netMinor !== 0n).length
    expect(recs.length).toBeLessThanOrEqual(nonZero === 0 ? 0 : nonZero - 1)
    for (const r of recs) {
      expect(r.amountMinor > 0n).toBe(true)
      expect(r.fromMemberId).not.toBe(r.toMemberId)
    }
  })

  test.prop([balancesArb, fc.integer()])('P-7: output does not depend on input order', (balances, seed) => {
    const shuffled = [...balances].sort(() => (seed % 2 === 0 ? 1 : -1))
    expect(recommendSettlements(shuffled)).toEqual(recommendSettlements(balances))
    expect(recommendSettlements([...balances].reverse())).toEqual(recommendSettlements(balances))
  })

  test.prop([balancesArb], { numRuns: 1000 })(
    'P-8: after recording recommendation #1, the next ones are #2..k',
    (balances) => {
      const recs = recommendSettlements(balances)
      if (recs.length === 0) return
      const [first, ...rest] = recs
      const next = balances.map((b) => ({
        memberId: b.memberId,
        netMinor:
          b.netMinor +
          (b.memberId === first!.fromMemberId ? first!.amountMinor : 0n) -
          (b.memberId === first!.toMemberId ? first!.amountMinor : 0n),
      }))
      expect(recommendSettlements(next)).toEqual(rest)
    },
  )

  test.prop([ledgerArb])('P-9: inputs are never mutated', ({ members, expenses, settlements }) => {
    const snapshot = structuredClone({ members, expenses, settlements })
    const balances = computeBalances(members, expenses, settlements)
    const balancesSnapshot = structuredClone(balances)
    recommendSettlements(balances)
    expect({ members, expenses, settlements }).toEqual(snapshot)
    expect(balances).toEqual(balancesSnapshot)
  })
})
