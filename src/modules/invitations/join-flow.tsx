'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { fr } from '@/i18n/fr'
import { joinWithInvitation, previewInvitation, type PreviewOutcome } from './actions'

const STORAGE_KEY = 'coloc4.invitation'
const JOIN_PATH = '/rejoindre'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// localStorage (not sessionStorage): the email-confirmation link opens a new tab,
// which must still find the invitation. Cleared on use and after 24 hours.
function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { token, savedAt } = JSON.parse(raw) as { token?: unknown; savedAt?: unknown }
    if (typeof token !== 'string' || typeof savedAt !== 'number' || Date.now() - savedAt > TOKEN_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, savedAt: Date.now() }))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode): the flow still works within this page.
  }
}

type View =
  | { kind: 'loading' }
  | { kind: 'preview'; outcome: PreviewOutcome }
  | { kind: 'message'; text: string; householdId?: string | null; askNewLink?: boolean }

const linkClass =
  'flex min-h-12 items-center justify-center rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2'

// Reads the raw token once: from the URL fragment (then stored for the sign-in
// detour and removed from the address bar), else from this tab's storage.
function takeToken(): string | null {
  const fromHash = window.location.hash.slice(1)
  if (fromHash) {
    storeToken(fromHash)
    window.history.replaceState(null, '', JOIN_PATH)
    return fromHash
  }
  return readStoredToken()
}

const subscribeNoop = () => () => {}

// The flow depends on browser-only state (fragment, localStorage): render it on the client only.
export function JoinFlow() {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false)
  if (!isClient) return <p role="status">{fr.join.checking}</p>
  return <JoinFlowClient />
}

function JoinFlowClient() {
  const router = useRouter()
  const [token] = useState(takeToken)
  const [view, setView] = useState<View>(() =>
    token ? { kind: 'loading' } : { kind: 'message', text: fr.join.results.NO_TOKEN },
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!token) return
    previewInvitation(token)
      .then((outcome) => setView({ kind: 'preview', outcome }))
      .catch(() => setView({ kind: 'message', text: fr.join.results.ERROR }))
  }, [token])

  function join() {
    if (!token) return
    startTransition(async () => {
      const result = await joinWithInvitation(token)
      switch (result.code) {
        case 'JOINED':
        case 'REACTIVATED':
        case 'ALREADY_MEMBER':
          storeToken(null)
          router.push(`/colocations/${result.householdId}`)
          return
        case 'AUTH_REQUIRED':
        case 'PROFILE_REQUIRED':
          setView({ kind: 'preview', outcome: { code: result.code } })
          return
        case 'ERROR':
        case 'RATE_LIMITED':
          setView({ kind: 'message', text: fr.join.results[result.code] })
          return
        default:
          storeToken(null)
          setView({ kind: 'message', text: fr.join.results[result.code], askNewLink: true })
      }
    })
  }

  if (view.kind === 'loading') return <p role="status">{fr.join.checking}</p>

  if (view.kind === 'message') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p role="alert">{view.text}</p>
        {view.askNewLink && <p>{fr.join.askNewLink}</p>}
        <Link href="/accueil" className="font-medium underline">
          {fr.join.backHome}
        </Link>
      </div>
    )
  }

  const { outcome } = view
  switch (outcome.code) {
    case 'AUTH_REQUIRED': {
      const next = encodeURIComponent(JOIN_PATH)
      return (
        <div className="flex w-full max-w-sm flex-col gap-3 text-center">
          <p>{fr.join.authRequired}</p>
          <Link href={`/inscription?suivant=${next}`} className={`${linkClass} bg-foreground text-background`}>
            {fr.home.signUp}
          </Link>
          <Link href={`/connexion?suivant=${next}`} className={`${linkClass} border border-zinc-400`}>
            {fr.home.signIn}
          </Link>
        </div>
      )
    }
    case 'PROFILE_REQUIRED':
      return (
        <div className="flex w-full max-w-sm flex-col gap-3 text-center">
          <p>{fr.join.profileRequired}</p>
          <Link
            href={`/profil?suivant=${encodeURIComponent(JOIN_PATH)}`}
            className={`${linkClass} bg-foreground text-background`}
          >
            {fr.join.chooseName}
          </Link>
        </div>
      )
    case 'VALID':
      return (
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <p className="text-xl font-medium">{fr.join.confirm(outcome.householdName ?? '')}</p>
          <p>{fr.join.confirmHint}</p>
          <button
            type="button"
            onClick={join}
            disabled={pending}
            className={`${linkClass} bg-foreground text-background disabled:opacity-60`}
          >
            {pending ? fr.join.pending : fr.join.submit}
          </button>
        </div>
      )
    case 'ALREADY_MEMBER':
      storeToken(null)
      return (
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <p>{fr.join.results.ALREADY_MEMBER}</p>
          <Link href={`/colocations/${outcome.householdId}`} className={`${linkClass} bg-foreground text-background`}>
            {fr.join.goToHousehold}
          </Link>
        </div>
      )
    case 'ERROR':
    case 'RATE_LIMITED':
      return <p role="alert">{fr.join.results[outcome.code]}</p>
    default:
      storeToken(null)
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <p role="alert">{fr.join.results[outcome.code]}</p>
          <p>{fr.join.askNewLink}</p>
          <Link href="/accueil" className="font-medium underline">
            {fr.join.backHome}
          </Link>
        </div>
      )
  }
}
