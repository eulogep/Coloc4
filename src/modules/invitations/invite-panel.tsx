'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, Link2, Share2, UserPlus } from 'lucide-react'
import { buttonClass } from '@/components/ui/button'
import { fieldBase } from '@/components/ui/text-field'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { createInvitationLink, revokeInvitation } from './actions'
import type { ActiveInvitation } from './queries'

type Props = {
  householdId: string
  householdName: string
  timezone: string
  invitations: ActiveInvitation[]
}

export function InvitePanel({ householdId, householdName, timezone, invitations }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: timezone }).format(new Date(iso))

  function create() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await createInvitationLink(householdId)
      if (!result.ok) {
        setError(fr.invitations.errors.createFailed)
        return
      }
      // Token in the fragment: never sent to servers or in Referer headers.
      setLink(`${window.location.origin}/rejoindre#${result.token}`)
    })
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    if (!link) return
    try {
      await navigator.share({ title: 'Coloc4', text: fr.invitations.shareText(householdName), url: link })
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  }

  function revoke(invitationId: string) {
    setError(null)
    setRevokingId(invitationId)
    startTransition(async () => {
      const result = await revokeInvitation(householdId, invitationId)
      if (!result.ok) setError(fr.invitations.errors.revokeFailed)
      setRevokingId(null)
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
          <UserPlus className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold">{fr.invitations.title}</h2>
          <p className="text-muted">{fr.invitations.intro}</p>
        </div>
      </div>

      {link ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-4">
          <label htmlFor="invite-link" className="font-bold">
            {fr.invitations.newLinkLabel}
          </label>
          <input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className={`${fieldBase} min-h-12 text-sm`}
          />
          <p className="text-sm text-muted">{fr.invitations.newLinkWarning}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={buttonClass('primary', 'flex-1')}>
              {copied ? <Check aria-hidden="true" className="size-5" /> : <Copy aria-hidden="true" className="size-5" />}
              {copied ? fr.invitations.copied : fr.invitations.copy}
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button type="button" onClick={share} className={buttonClass('secondary', 'flex-1')}>
                <Share2 aria-hidden="true" className="size-5" />
                {fr.invitations.share}
              </button>
            )}
          </div>
          <p role="status" className="sr-only">
            {copied ? fr.invitations.copied : ''}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className={buttonClass('primary')}
        >
          <Link2 aria-hidden="true" className="size-5" />
          {pending && !revokingId ? fr.invitations.creating : fr.invitations.create}
        </button>
      )}

      <FormMessage error={error} />

      <h3 className="font-extrabold">{fr.invitations.activeLinks}</h3>
      {invitations.length === 0 ? (
        <p className="text-muted">{fr.invitations.noActiveLinks}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invitations.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2">
              <span className="text-sm text-muted">
                {fr.invitations.linkSummary(i.useCount, i.maxUses, formatDate(i.expiresAt))}
              </span>
              <button
                type="button"
                onClick={() => revoke(i.id)}
                disabled={pending}
                className={buttonClass('secondary', 'ml-auto min-h-11 px-4 text-sm')}
              >
                {revokingId === i.id ? fr.invitations.revoking : fr.invitations.revoke}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
