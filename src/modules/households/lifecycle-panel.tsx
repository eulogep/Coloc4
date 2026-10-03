'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { archiveHousehold, leaveHousehold, transferOwnership } from './lifecycle-actions'

type Props = {
  householdId: string
  isOwner: boolean
  balanceSentence: string | null // null = settled
  transferCandidates: { id: string; displayName: string }[]
}

const button =
  'min-h-12 rounded-full px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'

export function LifecyclePanel({ householdId, isOwner, balanceSentence, transferCandidates }: Props) {
  const [confirming, setConfirming] = useState<'leave' | 'archive' | null>(null)
  const [target, setTarget] = useState(transferCandidates[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      const result = await action()
      setError(result?.error ?? null)
      if (!result?.error) setConfirming(null)
    })

  return (
    <div className="flex flex-col gap-6">
      {isOwner && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{fr.lifecycle.transferTitle}</h2>
          {transferCandidates.length === 0 ? (
            <p>{fr.lifecycle.noOneToTransfer}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="transfer-to" className="font-medium">
                {fr.lifecycle.transferTo}
              </label>
              <select
                id="transfer-to"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="min-h-12 rounded-lg border border-zinc-400 bg-background px-3"
              >
                {transferCandidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !target}
                onClick={() => run(() => transferOwnership(householdId, target))}
                className={`${button} border border-zinc-400`}
              >
                {pending ? fr.lifecycle.transferring : fr.lifecycle.transfer}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{fr.lifecycle.leaveTitle}</h2>
        {isOwner ? (
          <p>{fr.lifecycle.ownerCannotLeave}</p>
        ) : (
          <>
            <p>{fr.lifecycle.leaveIntro}</p>
            {confirming === 'leave' ? (
              <div className="flex flex-col gap-2 rounded-lg border border-red-700 p-3">
                {balanceSentence && (
                  <p role="alert">
                    <strong>{fr.lifecycle.unsettledWarning}</strong> {fr.lifecycle.unsettledDetail(balanceSentence)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => leaveHousehold(householdId))}
                    className={`${button} bg-red-700 text-white`}
                  >
                    {pending ? fr.lifecycle.leaving : fr.lifecycle.confirmLeave}
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className={`${button} border border-zinc-400`}>
                    {fr.lifecycle.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming('leave')}
                className={`${button} border border-red-700 text-red-800 dark:text-red-300`}
              >
                {fr.lifecycle.leave}
              </button>
            )}
          </>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{fr.lifecycle.archiveTitle}</h2>
          <p>{fr.lifecycle.archiveIntro}</p>
          {confirming === 'archive' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => archiveHousehold(householdId))}
                className={`${button} bg-red-700 text-white`}
              >
                {pending ? fr.lifecycle.archiving : fr.lifecycle.confirmArchive}
              </button>
              <button type="button" onClick={() => setConfirming(null)} className={`${button} border border-zinc-400`}>
                {fr.lifecycle.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming('archive')}
              className={`${button} border border-red-700 text-red-800 dark:text-red-300`}
            >
              {fr.lifecycle.archive}
            </button>
          )}
        </section>
      )}

      <FormMessage error={error} />
    </div>
  )
}
