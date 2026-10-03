'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { Trash2 } from 'lucide-react'
import { FormMessage } from '@/components/ui/form-message'
import { buttonClass } from '@/components/ui/button'
import { deleteExpense } from './actions'

export function DeleteExpenseButton({ householdId, expenseId }: { householdId: string; expenseId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={buttonClass('danger-outline')}>
        <Trash2 aria-hidden="true" className="size-4" />
        {fr.expenses.delete}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-danger-tint p-4">
      <p className="font-bold">{fr.expenses.confirmDelete}</p>
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
          className={buttonClass('danger', 'flex-1')}
        >
          {pending ? fr.expenses.deleting : fr.expenses.delete}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={buttonClass('secondary', 'flex-1')}>
          {fr.expenses.cancel}
        </button>
      </div>
      <FormMessage error={error} />
    </div>
  )
}
