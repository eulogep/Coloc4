'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { deleteSettlement } from './actions'

export type SettlementLine = { id: string; text: string; date: string }

export function SettlementHistory({ householdId, lines }: { householdId: string; lines: SettlementLine[] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const button = 'min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'

  if (lines.length === 0) return <p>{fr.settlements.historyEmpty}</p>

  return (
    <>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-col gap-2 rounded-lg border border-zinc-300 px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <span>
                {line.text}
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">{line.date}</span>
              </span>
              {confirmingId !== line.id && (
                <button type="button" onClick={() => setConfirmingId(line.id)} className={`${button} border border-zinc-400`}>
                  {fr.settlements.cancel}
                </button>
              )}
            </div>
            {confirmingId === line.id && (
              <div className="flex flex-col gap-2">
                <p className="text-sm">{fr.settlements.confirmCancel}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteSettlement(householdId, line.id)
                        setError(result.error)
                        if (!result.error) setConfirmingId(null)
                      })
                    }
                    className={`${button} bg-red-700 text-white`}
                  >
                    {pending ? fr.settlements.cancelling : fr.settlements.cancel}
                  </button>
                  <button type="button" onClick={() => setConfirmingId(null)} className={`${button} border border-zinc-400`}>
                    {fr.settlements.keep}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <FormMessage error={error} />
    </>
  )
}
