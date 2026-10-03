// Result codes returned by preview_invitation / join_household (design §9.3).
export const JOIN_RESULT_CODES = [
  'JOINED',
  'REACTIVATED',
  'ALREADY_MEMBER',
  'EXPIRED',
  'REVOKED',
  'EXHAUSTED',
  'INVALID',
  'RATE_LIMITED',
] as const

export type JoinResultCode = (typeof JOIN_RESULT_CODES)[number]
export type PreviewResultCode = Exclude<JoinResultCode, 'JOINED' | 'REACTIVATED'> | 'VALID'

export function isJoinResultCode(value: unknown): value is JoinResultCode {
  return typeof value === 'string' && (JOIN_RESULT_CODES as readonly string[]).includes(value)
}

// Base64url, 256 bits → 43 characters (see create_invitation).
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
