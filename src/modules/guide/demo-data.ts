// Fictional roommates and ledger for the guide demos. Uses the real money domain.
import type { LedgerExpense, LedgerSettlement } from '@/modules/expenses/domain/balances'
import { splitEqual } from '@/modules/expenses/domain/split'

export const DEMO_MEMBERS = [
  { id: 'demo-emma', name: 'Emma' },
  { id: 'demo-lucas', name: 'Lucas' },
  { id: 'demo-zoe', name: 'Zoé' },
] as const

export const DEMO_IDS = DEMO_MEMBERS.map((m) => m.id)
export const demoName = (id: string) => DEMO_MEMBERS.find((m) => m.id === id)?.name ?? '?'

export type DemoExpense = LedgerExpense & { title: string }

function equal(id: string, title: string, paidBy: string, amountMinor: bigint, participants: readonly string[]): DemoExpense {
  const split = splitEqual(amountMinor, participants)
  if (!split.ok) throw new Error(split.error)
  return { id, title, paidBy, amountMinor, shares: split.value, deleted: false }
}

export const START_EXPENSES: DemoExpense[] = [
  equal('d1', 'Courses', 'demo-emma', 9000n, DEMO_IDS),
  equal('d2', 'Internet', 'demo-lucas', 3000n, ['demo-lucas', 'demo-zoe']),
]

export const PIZZA: DemoExpense = equal('d3', 'Pizza', 'demo-zoe', 2400n, DEMO_IDS)

export type DemoSettlement = LedgerSettlement
