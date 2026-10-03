export const DISPLAY_NAME_MAX_LENGTH = 40

export type DisplayNameError = 'EMPTY' | 'TOO_LONG'

export type DisplayNameResult =
  | { ok: true; value: string }
  | { ok: false; error: DisplayNameError }

// Trims and collapses internal whitespace; mirrors the DB check (trimmed, 1..40 chars).
export function normalizeDisplayName(input: string): DisplayNameResult {
  const value = input.trim().replace(/\s+/g, ' ')
  if (value.length === 0) return { ok: false, error: 'EMPTY' }
  if ([...value].length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, error: 'TOO_LONG' }
  return { ok: true, value }
}
