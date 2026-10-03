import { compareMemberId, type MemberId } from './member-id'
import type { Minor } from './money'
import { err, ok, type Result } from './result'

export type ExpenseShare = { memberId: MemberId; amountMinor: Minor }

export type SplitError =
  | 'NOT_POSITIVE_AMOUNT'
  | 'NO_PARTICIPANT'
  | 'DUPLICATE_PARTICIPANT'
  | 'NEGATIVE_SHARE'
  | 'ALL_ZERO'
  | 'SUM_MISMATCH'

function hasDuplicates(ids: readonly MemberId[]): boolean {
  return new Set(ids.map((id) => id.toLowerCase())).size !== ids.length
}

/**
 * Equal split (§4.5): floor(amount / n) each, then the remainder one cent at a
 * time to participants in member-id order. Output is in member-id order.
 * 1000 / 3 → 334, 333, 333.
 */
export function splitEqual(amount: Minor, participants: readonly MemberId[]): Result<ExpenseShare[], SplitError> {
  if (amount <= 0n) return err('NOT_POSITIVE_AMOUNT')
  if (participants.length === 0) return err('NO_PARTICIPANT')
  if (hasDuplicates(participants)) return err('DUPLICATE_PARTICIPANT')

  const sorted = [...participants].sort(compareMemberId)
  const n = BigInt(sorted.length)
  const base = amount / n
  const remainder = amount % n
  return ok(
    sorted.map((memberId, index) => ({
      memberId,
      amountMinor: base + (BigInt(index) < remainder ? 1n : 0n),
    })),
  )
}

/** Validates an exact split (§4.6). Returns the shares in member-id order. */
export function validateExactSplit(
  amount: Minor,
  shares: readonly ExpenseShare[],
): Result<ExpenseShare[], SplitError> {
  if (amount <= 0n) return err('NOT_POSITIVE_AMOUNT')
  if (shares.length === 0) return err('NO_PARTICIPANT')
  if (hasDuplicates(shares.map((s) => s.memberId))) return err('DUPLICATE_PARTICIPANT')
  if (shares.some((s) => s.amountMinor < 0n)) return err('NEGATIVE_SHARE')
  if (!shares.some((s) => s.amountMinor > 0n)) return err('ALL_ZERO')
  if (sumShares(shares) !== amount) return err('SUM_MISMATCH')
  return ok([...shares].sort((a, b) => compareMemberId(a.memberId, b.memberId)))
}

export function sumShares(shares: readonly ExpenseShare[]): Minor {
  return shares.reduce((total, s) => total + s.amountMinor, 0n)
}

/** "Reste à répartir": positive = still to assign, negative = over-assigned. */
export function remainingToSplit(amount: Minor, shares: readonly ExpenseShare[]): Minor {
  return amount - sumShares(shares)
}
