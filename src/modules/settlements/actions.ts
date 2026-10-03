'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fr } from '@/i18n/fr'
import { isUuid } from '@/lib/uuid'
import { requireUser } from '@/modules/auth/session'
import { isIsoDate } from '@/modules/expenses/dates'
import { minorToWire, parseEurAmount } from '@/modules/expenses/domain/money'

export type SettlementFormState = { error: string | null; needsConfirmation: boolean }

type ErrorCode = keyof typeof fr.settlements.errors

const fail = (code: string): SettlementFormState => ({
  error: code in fr.settlements.errors ? fr.settlements.errors[code as ErrorCode] : fr.settlements.errors.UNKNOWN,
  needsConfirmation: false,
})

/** Records "I already paid / was paid outside Coloc4". The caller is always one of the two parties. */
export async function recordSettlement(
  householdId: string,
  myMemberId: string,
  _prev: SettlementFormState,
  formData: FormData,
): Promise<SettlementFormState> {
  if (!isUuid(householdId) || !isUuid(myMemberId)) return fail('INVALID_MEMBERS')

  const other = String(formData.get('other') ?? '')
  if (!isUuid(other) || other === myMemberId) return fail('INVALID_MEMBERS')

  const amount = parseEurAmount(String(formData.get('amount') ?? ''))
  if (!amount.ok) return fail(amount.error === 'EMPTY' ? 'EMPTY_AMOUNT' : amount.error)

  const settledOn = String(formData.get('settledOn') ?? '')
  if (!isIsoDate(settledOn)) return fail('INVALID_DATE')

  const iPaid = formData.get('direction') !== 'received'
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('record_settlement', {
    p_household_id: householdId,
    p_from_member_id: iPaid ? myMemberId : other,
    p_to_member_id: iPaid ? other : myMemberId,
    p_amount_minor: minorToWire(amount.value),
    p_settled_on: settledOn,
    p_confirm_overshoot: formData.get('confirmOvershoot') === 'true',
  })
  if (error) return fail(error.message)
  if (data?.[0]?.result_code === 'CONFIRMATION_REQUIRED') return { error: null, needsConfirmation: true }
  if (data?.[0]?.result_code !== 'RECORDED') return fail('UNKNOWN')

  revalidatePath(`/colocations/${householdId}`, 'layout')
  redirect(`/colocations/${householdId}/soldes`)
}

export async function deleteSettlement(householdId: string, settlementId: string): Promise<{ error: string | null }> {
  if (!isUuid(householdId) || !isUuid(settlementId)) return { error: fr.settlements.errors.DELETE_FAILED }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('delete_settlement', { p_settlement_id: settlementId })
  if (error) return { error: fr.settlements.errors.DELETE_FAILED }
  revalidatePath(`/colocations/${householdId}`, 'layout')
  return { error: null }
}
