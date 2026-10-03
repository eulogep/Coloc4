// fast-check generators shared by domain tests (test-only module).
import fc from 'fast-check'
import { MAX_AMOUNT_MINOR } from './money'

export const memberIdArb = fc.uuid({ version: 4 })

export const memberIdsArb = (min = 1, max = 8) =>
  fc.uniqueArray(memberIdArb, { minLength: min, maxLength: max, selector: (id) => id.toLowerCase() })

export const amountArb = fc.bigInt({ min: 1n, max: MAX_AMOUNT_MINOR })

// A random but valid household ledger: 2–8 members, expenses with equal or exact
// shares (payer may or may not participate), soft deletions, settlements.
export const ledgerArb = memberIdsArb(2, 8).chain((members) => {
  const memberArb = fc.constantFrom(...members)
  const subsetArb = fc.subarray(members, { minLength: 1 })

  const equalSharesArb = fc.tuple(amountArb, subsetArb).map(([amount, participants]) => {
    const n = BigInt(participants.length)
    const sorted = [...participants].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const shares = sorted.map((memberId, i) => ({
      memberId,
      amountMinor: amount / n + (BigInt(i) < amount % n ? 1n : 0n),
    }))
    return { amount, shares }
  })
  const exactSharesArb = subsetArb
    .chain((participants) =>
      fc.tuple(fc.constant(participants), fc.array(fc.bigInt({ min: 0n, max: 50_000n }), {
        minLength: participants.length,
        maxLength: participants.length,
      })),
    )
    .filter(([, amounts]) => amounts.some((a) => a > 0n))
    .map(([participants, amounts]) => ({
      amount: amounts.reduce((t, a) => t + a, 0n),
      shares: participants.map((memberId, i) => ({ memberId, amountMinor: amounts[i]! })),
    }))

  const expenseArb = fc.record({
    id: fc.uuid(),
    paidBy: memberArb,
    split: fc.oneof(equalSharesArb, exactSharesArb),
    deleted: fc.integer({ min: 0, max: 4 }).map((n) => n === 0), // ~20% soft-deleted
  }).map(({ id, paidBy, split, deleted }) => ({
    id,
    paidBy,
    amountMinor: split.amount,
    shares: split.shares,
    deleted,
  }))

  const settlementArb = fc
    .record({ id: fc.uuid(), from: memberArb, to: memberArb, amountMinor: amountArb, deleted: fc.boolean() })
    .filter((s) => s.from !== s.to)

  return fc.record({
    members: fc.constant(members),
    expenses: fc.array(expenseArb, { maxLength: 30 }),
    settlements: fc.array(settlementArb, { maxLength: 10 }),
  })
})

// Balances that sum to zero, with 1–8 members (zeros allowed).
export const balancesArb = memberIdsArb(1, 8).chain((members) =>
  fc
    .array(fc.bigInt({ min: -MAX_AMOUNT_MINOR, max: MAX_AMOUNT_MINOR }), {
      minLength: members.length - 1,
      maxLength: members.length - 1,
    })
    .map((nets) => {
      const last = -nets.reduce((t, n) => t + n, 0n)
      return members.map((memberId, i) => ({ memberId, netMinor: i < nets.length ? nets[i]! : last }))
    }),
)
