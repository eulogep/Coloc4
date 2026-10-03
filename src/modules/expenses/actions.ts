'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'
import { isIsoDate } from './dates'
import { minorToWire, parseEurAmount, parseEurShare } from './domain/money'
import { validateExactSplit } from './domain/split'
import { expenseErrorMessage } from './errors'

export type ExpenseFormState = { error: string | null }

const fail = (code: string): ExpenseFormState => ({ error: expenseErrorMessage(code) })

/**
 * Create (expenseId = null) or update an expense. Client-side figures are only a
 * preview: the RPC re-validates everything and computes equal shares itself.
 */
export async function saveExpense(
  householdId: string,
  expenseId: string | null,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  if (!isUuid(householdId) || (expenseId !== null && !isUuid(expenseId))) return fail('NOT_FOUND')

  const amount = parseEurAmount(String(formData.get('amount') ?? ''))
  if (!amount.ok) return fail(amount.error === 'EMPTY' ? 'EMPTY_AMOUNT' : amount.error)

  const spentOn = String(formData.get('spentOn') ?? '')
  if (!isIsoDate(spentOn)) return fail('INVALID_DATE')

  const splitMode = formData.get('splitMode') === 'exact' ? 'exact' : 'equal'
  const participantIds = formData.getAll('participants').map(String).filter(isUuid)
  if (participantIds.length === 0) return fail('INVALID_PARTICIPANTS')

  let participants: unknown
  if (splitMode === 'equal') {
    participants = participantIds
  } else {
    const shares = []
    for (const memberId of participantIds) {
      const share = parseEurShare(String(formData.get(`share:${memberId}`) ?? ''))
      if (!share.ok) return fail('INVALID_SHARE')
      if (share.value > 0n) shares.push({ memberId, amountMinor: share.value })
    }
    const valid = validateExactSplit(amount.value, shares)
    if (!valid.ok) return fail(valid.error === 'NO_PARTICIPANT' ? 'ALL_ZERO' : valid.error)
    participants = valid.value.map((s) => ({ memberId: s.memberId, amountMinor: minorToWire(s.amountMinor) }))
  }

  const fields = {
    p_title: String(formData.get('title') ?? ''),
    p_amount_minor: minorToWire(amount.value),
    p_paid_by_member_id: String(formData.get('paidBy') ?? ''),
    p_split_mode: splitMode,
    p_spent_on: spentOn,
    p_participants: participants as never,
  } as const

  const { supabase } = await requireUser()
  const { error } =
    expenseId === null
      ? await supabase.rpc('create_expense', { p_household_id: householdId, ...fields })
      : await supabase.rpc('update_expense', { p_expense_id: expenseId, ...fields })
  if (error) return fail(error.message)

  revalidatePath(`/colocations/${householdId}`, 'layout')
  redirect(
    expenseId === null
      ? `/colocations/${householdId}/depenses`
      : `/colocations/${householdId}/depenses/${expenseId}`,
  )
}

export async function deleteExpense(householdId: string, expenseId: string): Promise<{ error: string | null }> {
  if (!isUuid(householdId) || !isUuid(expenseId)) return { error: expenseErrorMessage('NOT_FOUND') }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('delete_expense', { p_expense_id: expenseId })
  if (error) return { error: expenseErrorMessage('DELETE_FAILED') }
  revalidatePath(`/colocations/${householdId}`, 'layout')
  redirect(`/colocations/${householdId}/depenses`)
}
