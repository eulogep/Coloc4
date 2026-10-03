import 'server-only'
import { requireUser } from '@/modules/auth/session'
import { computeBalances, sumNets, type MemberBalance } from './domain/balances'
import { minorFromWire } from './domain/money'
import { compareMemberId } from './domain/member-id'
import { getLedger, type Ledger } from './queries'

export type HouseholdBalances =
  | { ok: true; balances: MemberBalance[]; ledger: Ledger }
  | { ok: false }

/**
 * Balances computed by the pure domain from the ledger, cross-checked against the
 * database view. Any disagreement or Σ net ≠ 0 is a critical invariant failure
 * (§18): it is logged and the UI refuses to show figures.
 */
export async function getHouseholdBalances(householdId: string, memberIds: string[]): Promise<HouseholdBalances> {
  const { supabase } = await requireUser()
  const [ledger, view] = await Promise.all([
    getLedger(householdId),
    supabase.from('member_balances').select('member_id, net_minor').eq('household_id', householdId),
  ])
  if (view.error) throw view.error

  const balances = computeBalances(memberIds, ledger.expenses, ledger.settlements)
  const fromView = (view.data ?? [])
    .map((r) => ({ memberId: r.member_id as string, netMinor: minorFromWire(r.net_minor as string) }))
    .sort((a, b) => compareMemberId(a.memberId, b.memberId))

  const consistent =
    sumNets(balances) === 0n &&
    fromView.length === balances.length &&
    fromView.every((v, i) => v.memberId === balances[i]!.memberId && v.netMinor === balances[i]!.netMinor)

  if (!consistent) {
    // Ids only: no names, amounts or free text in logs.
    console.error('[coloc4] CRITICAL balance invariant failure', { householdId })
    return { ok: false }
  }
  return { ok: true, balances, ledger }
}
