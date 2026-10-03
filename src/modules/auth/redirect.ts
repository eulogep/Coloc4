// Only same-origin absolute paths are allowed as post-auth destinations (no open redirect).
export function safeNextPath(raw: unknown, fallback = '/accueil'): string {
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback
  return raw
}
