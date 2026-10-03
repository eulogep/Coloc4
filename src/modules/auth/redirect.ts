// Only same-origin destinations are allowed after authentication (no open redirect).
export function safeNextPath(raw: unknown, fallback = '/accueil'): string {
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback
  return raw
}

/**
 * Like safeNextPath, but also accepts an absolute URL on `origin` (email links
 * carry Supabase's RedirectTo as a full URL) and reduces it to its path.
 */
export function safeNextFromLink(raw: unknown, origin: string, fallback = '/accueil'): string {
  if (typeof raw !== 'string' || raw === '') return fallback
  if (raw.startsWith('/')) return safeNextPath(raw, fallback)
  try {
    const url = new URL(raw)
    if (url.origin !== origin) return fallback
    return safeNextPath(`${url.pathname}${url.search}`, fallback)
  } catch {
    return fallback
  }
}
