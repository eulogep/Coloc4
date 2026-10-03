import { compareMemberId, type MemberId } from './member-id'
import type { Minor } from './money'
import type { ExpenseShare } from './split'

export type LedgerExpense = {
  id: string
  paidBy: MemberId
  amountMinor: Minor
  shares: readonly ExpenseShare[]
  deleted: boolean
}

export type LedgerSettlement = {
  id: string
  from: MemberId
  to: MemberId
  amountMinor: Minor
  deleted: boolean
}

export type MemberBalance = { memberId: MemberId; netMinor: Minor }

export class LedgerError extends Error {
  override name = 'LedgerError'
}

/**
 * net(m) = paid(m) − owed(m) + settlements_sent(m) − settlements_received(m)   (§4.7)
 * net > 0: others owe m · net < 0: m owes · deleted records are ignored.
 * `members` must list every member referenced by the ledger (active, former and
 * anonymized alike); the result has one entry per member, in member-id order.
 */
export function computeBalances(
  members: readonly MemberId[],
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): MemberBalance[] {
  const net = new Map<MemberId, Minor>(members.map((m) => [m, 0n]))
  const add = (memberId: MemberId, delta: Minor) => {
    const current = net.get(memberId)
    if (current === undefined) throw new LedgerError(`Unknown member in ledger: ${memberId}`)
    net.set(memberId, current + delta)
  }

  for (const e of expenses) {
    if (e.deleted) continue
    add(e.paidBy, e.amountMinor)
    for (const s of e.shares) add(s.memberId, -s.amountMinor)
  }
  for (const s of settlements) {
    if (s.deleted) continue
    add(s.from, s.amountMinor)
    add(s.to, -s.amountMinor)
  }

  return [...net.entries()]
    .map(([memberId, netMinor]) => ({ memberId, netMinor }))
    .sort((a, b) => compareMemberId(a.memberId, b.memberId))
}

export type BalanceLine =
  | { kind: 'expense'; id: string; paidMinor: Minor; shareMinor: Minor; deltaMinor: Minor }
  | { kind: 'settlement_sent' | 'settlement_received'; id: string; deltaMinor: Minor }

/** Why a member's balance is what it is (§13.5 explainability). Σ deltaMinor = net. */
export function explainBalance(
  memberId: MemberId,
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): BalanceLine[] {
  const lines: BalanceLine[] = []
  for (const e of expenses) {
    if (e.deleted) continue
    const paidMinor = e.paidBy === memberId ? e.amountMinor : 0n
    const shareMinor = e.shares.find((s) => s.memberId === memberId)?.amountMinor ?? 0n
    if (paidMinor === 0n && shareMinor === 0n) continue
    lines.push({ kind: 'expense', id: e.id, paidMinor, shareMinor, deltaMinor: paidMinor - shareMinor })
  }
  for (const s of settlements) {
    if (s.deleted) continue
    if (s.from === memberId) lines.push({ kind: 'settlement_sent', id: s.id, deltaMinor: s.amountMinor })
    if (s.to === memberId) lines.push({ kind: 'settlement_received', id: s.id, deltaMinor: -s.amountMinor })
  }
  return lines
}

export function sumNets(balances: readonly MemberBalance[]): Minor {
  return balances.reduce((total, b) => total + b.netMinor, 0n)
}
