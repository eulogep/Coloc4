'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { buttonClass } from '@/components/ui/button'
import { deleteSettlement } from './actions'

export type SettlementLine = { id: string; text: string; date: string }

export function SettlementHistory({ householdId, lines }: { householdId: string; lines: SettlementLine[] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const small = 'min-h-11 px-4 text-sm'

  if (lines.length === 0) return <p className="text-muted">{fr.settlements.historyEmpty}</p>

  return (
    <>
      <ul className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">
                {line.text}
                <span className="block text-sm font-normal text-muted">{line.date}</span>
              </span>
              {confirmingId !== line.id && (
                <button type="button" onClick={() => setConfirmingId(line.id)} className={buttonClass('secondary', small)}>
                  {fr.settlements.cancel}
                </button>
              )}
            </div>
            {confirmingId === line.id && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted">{fr.settlements.confirmCancel}</p>
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
                    className={buttonClass('danger', small)}
                  >
                    {pending ? fr.settlements.cancelling : fr.settlements.cancel}
                  </button>
                  <button type="button" onClick={() => setConfirmingId(null)} className={buttonClass('secondary', small)}>
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
