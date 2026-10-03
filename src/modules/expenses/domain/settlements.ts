import { LedgerError, sumNets, type MemberBalance } from './balances'
import { compareMemberId, type MemberId } from './member-id'
import type { Minor } from './money'

export type SettlementRecommendation = { fromMemberId: MemberId; toMemberId: MemberId; amountMinor: Minor }

type Entry = { memberId: MemberId; amount: Minor }

// Largest amount first; equal amounts by member-id order (deterministic tie-break).
function pickLargest(entries: readonly Entry[]): Entry | undefined {
  let best: Entry | undefined
  for (const e of entries) {
    if (!best || e.amount > best.amount || (e.amount === best.amount && compareMemberId(e.memberId, best.memberId) < 0)) {
      best = e
    }
  }
  return best
}

/**
 * Deterministic greedy debt simplification (ADR-005, PC-8). At each step the
 * largest debtor pays the largest creditor min(debt, credit). Produces at most
 * n − 1 transfers for n non-zero members. Not claimed to be minimal.
 * Recommendations are a projection: inputs are never mutated or stored.
 */
export function recommendSettlements(balances: readonly MemberBalance[]): SettlementRecommendation[] {
  if (sumNets(balances) !== 0n) throw new LedgerError('Balances do not sum to zero')

  const creditors: Entry[] = []
  const debtors: Entry[] = []
  for (const b of balances) {
    if (b.netMinor > 0n) creditors.push({ memberId: b.memberId, amount: b.netMinor })
    if (b.netMinor < 0n) debtors.push({ memberId: b.memberId, amount: -b.netMinor })
  }

  const recommendations: SettlementRecommendation[] = []
  for (;;) {
    const debtor = pickLargest(debtors)
    const creditor = pickLargest(creditors)
    if (!debtor || !creditor) break

    const amount = debtor.amount < creditor.amount ? debtor.amount : creditor.amount
    recommendations.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amountMinor: amount })
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0n) debtors.splice(debtors.indexOf(debtor), 1)
    if (creditor.amount === 0n) creditors.splice(creditors.indexOf(creditor), 1)
  }
  return recommendations
}
