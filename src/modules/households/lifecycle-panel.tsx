'use client'

import { useState, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { buttonClass } from '@/components/ui/button'
import { fieldClass } from '@/components/ui/text-field'
import { archiveHousehold, leaveHousehold, transferOwnership } from './lifecycle-actions'

type Props = {
  householdId: string
  isOwner: boolean
  balanceSentence: string | null // null = settled
  transferCandidates: { id: string; displayName: string }[]
}

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
    <div className="flex flex-col gap-4">
      {isOwner && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-lg font-extrabold">{fr.lifecycle.transferTitle}</h2>
          {transferCandidates.length === 0 ? (
            <p className="text-muted">{fr.lifecycle.noOneToTransfer}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="transfer-to" className="font-bold">
                {fr.lifecycle.transferTo}
              </label>
              <select
                id="transfer-to"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={fieldClass}
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
                className={buttonClass('secondary')}
              >
                {pending ? fr.lifecycle.transferring : fr.lifecycle.transfer}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-lg font-extrabold">{fr.lifecycle.leaveTitle}</h2>
        {isOwner ? (
          <p className="text-muted">{fr.lifecycle.ownerCannotLeave}</p>
        ) : (
          <>
            <p className="text-muted">{fr.lifecycle.leaveIntro}</p>
            {confirming === 'leave' ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-danger-tint p-4">
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
                    className={buttonClass('danger')}
                  >
                    {pending ? fr.lifecycle.leaving : fr.lifecycle.confirmLeave}
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className={buttonClass('secondary')}>
                    {fr.lifecycle.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming('leave')}
                className={buttonClass('danger-outline')}
              >
                {fr.lifecycle.leave}
              </button>
            )}
          </>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-lg font-extrabold">{fr.lifecycle.archiveTitle}</h2>
          <p className="text-muted">{fr.lifecycle.archiveIntro}</p>
          {confirming === 'archive' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => archiveHousehold(householdId))}
                className={buttonClass('danger')}
              >
                {pending ? fr.lifecycle.archiving : fr.lifecycle.confirmArchive}
              </button>
              <button type="button" onClick={() => setConfirming(null)} className={buttonClass('secondary')}>
                {fr.lifecycle.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming('archive')}
              className={buttonClass('danger-outline')}
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
