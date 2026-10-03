'use client'

import { useState, useTransition } from 'react'
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

const buttonClass =
  'min-h-12 rounded-full px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'

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
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{fr.invitations.title}</h2>
      <p>{fr.invitations.intro}</p>

      {link ? (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-400 p-3">
          <label htmlFor="invite-link" className="font-medium">
            {fr.invitations.newLinkLabel}
          </label>
          <input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-12 rounded-lg border border-zinc-300 bg-background px-3 text-sm"
          />
          <p className="text-sm">{fr.invitations.newLinkWarning}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={`${buttonClass} bg-foreground text-background`}>
              {copied ? fr.invitations.copied : fr.invitations.copy}
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button type="button" onClick={share} className={`${buttonClass} border border-zinc-400`}>
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
          className={`${buttonClass} bg-foreground text-background`}
        >
          {pending && !revokingId ? fr.invitations.creating : fr.invitations.create}
        </button>
      )}

      <FormMessage error={error} />

      <h3 className="font-medium">{fr.invitations.activeLinks}</h3>
      {invitations.length === 0 ? (
        <p>{fr.invitations.noActiveLinks}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invitations.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2">
              <span className="text-sm">
                {fr.invitations.linkSummary(i.useCount, i.maxUses, formatDate(i.expiresAt))}
              </span>
              <button
                type="button"
                onClick={() => revoke(i.id)}
                disabled={pending}
                className={`${buttonClass} ml-auto border border-zinc-400 text-sm`}
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
