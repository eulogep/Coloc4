import { fr } from '@/i18n/fr'

export type ExpenseErrorCode = keyof typeof fr.expenses.errors

// RPC message codes and client validation codes → French.
export function expenseErrorMessage(code: string | undefined): string {
  if (code && code in fr.expenses.errors) return fr.expenses.errors[code as ExpenseErrorCode]
  return fr.expenses.errors.UNKNOWN
}
