import 'server-only'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'
import type { LedgerExpense, LedgerSettlement } from './domain/balances'
import { minorFromWire, type Minor } from './domain/money'
import type { ExpenseShare } from './domain/split'

// Every money column is selected with ::text and converted with minorFromWire:
// bigint never travels as a JSON number (§4.2).

export type ExpenseListItem = {
  id: string
  title: string
  amountMinor: Minor
  paidByMemberId: string
  spentOn: string
  shares: ExpenseShare[]
}

export type ExpenseDetail = ExpenseListItem & { splitMode: 'equal' | 'exact'; deleted: boolean }

const EXPENSE_COLUMNS =
  'id, title, amount_minor::text, paid_by_member_id, split_mode, spent_on, deleted_at, expense_shares(member_id, share_amount_minor::text)'

type ExpenseRow = {
  id: string
  title: string
  amount_minor: string
  paid_by_member_id: string
  split_mode: 'equal' | 'exact'
  spent_on: string
  deleted_at: string | null
  expense_shares: { member_id: string; share_amount_minor: string }[]
}

function toDetail(row: ExpenseRow): ExpenseDetail {
  return {
    id: row.id,
    title: row.title,
    amountMinor: minorFromWire(row.amount_minor),
    paidByMemberId: row.paid_by_member_id,
    splitMode: row.split_mode,
    spentOn: row.spent_on,
    deleted: row.deleted_at !== null,
    shares: row.expense_shares.map((s) => ({ memberId: s.member_id, amountMinor: minorFromWire(s.share_amount_minor) })),
  }
}

export async function listExpenses(householdId: string): Promise<ExpenseListItem[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data as ExpenseRow[]).map(toDetail)
}

export async function getExpense(householdId: string, expenseId: string): Promise<ExpenseDetail | null> {
  if (!isUuid(expenseId)) return null
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .eq('household_id', householdId)
    .eq('id', expenseId)
    .maybeSingle()
  if (error) throw error
  return data ? toDetail(data as ExpenseRow) : null
}

export type Ledger = {
  expenses: (LedgerExpense & { title: string; spentOn: string })[]
  settlements: (LedgerSettlement & { settledOn: string })[]
}

/** Full non-deleted history of a household, for balances and their explanation. */
export async function getLedger(householdId: string): Promise<Ledger> {
  const { supabase } = await requireUser()
  const [expenses, settlements] = await Promise.all([
    supabase
      .from('expenses')
      .select(EXPENSE_COLUMNS)
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('spent_on', { ascending: false }),
    supabase
      .from('settlements')
      .select('id, from_member_id, to_member_id, amount_minor::text, settled_on')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('settled_on', { ascending: false }),
  ])
  if (expenses.error) throw expenses.error
  if (settlements.error) throw settlements.error

  return {
    expenses: (expenses.data as ExpenseRow[]).map((row) => {
      const e = toDetail(row)
      return { id: e.id, title: e.title, spentOn: e.spentOn, paidBy: e.paidByMemberId, amountMinor: e.amountMinor, shares: e.shares, deleted: false }
    }),
    settlements: settlements.data.map((s) => ({
      id: s.id,
      from: s.from_member_id,
      to: s.to_member_id,
      amountMinor: minorFromWire(s.amount_minor),
      settledOn: s.settled_on,
      deleted: false,
    })),
  }
}
