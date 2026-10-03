'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { deleteExpense } from './actions'

export function DeleteExpenseButton({ householdId, expenseId }: { householdId: string; expenseId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const buttonClass = 'min-h-12 rounded-full px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${buttonClass} border border-red-700 text-red-800 dark:text-red-300`}>
        {fr.expenses.delete}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-700 p-3">
      <p>{fr.expenses.confirmDelete}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteExpense(householdId, expenseId)
              if (result?.error) setError(result.error)
            })
          }
          className={`${buttonClass} bg-red-700 text-white`}
        >
          {pending ? fr.expenses.deleting : fr.expenses.delete}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={`${buttonClass} border border-zinc-400`}>
          {fr.expenses.cancel}
        </button>
      </div>
      <FormMessage error={error} />
    </div>
  )
}
