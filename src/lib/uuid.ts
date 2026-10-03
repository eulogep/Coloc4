const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Canonical lowercase UUID check for route params before they reach the database.
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
