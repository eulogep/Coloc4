export type MemberId = string

/**
 * Deterministic member order (PC-7): byte order of the UUID, which equals the
 * lexicographic order of its canonical lowercase hex form and Postgres `uuid` ordering.
 * Plain code-unit comparison, never localeCompare.
 */
export function compareMemberId(a: MemberId, b: MemberId): -1 | 0 | 1 {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  return x < y ? -1 : x > y ? 1 : 0
}
