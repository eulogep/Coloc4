// Calendar dates (expenses.spent_on) are plain YYYY-MM-DD values, no time zone.

/** Today's date in an IANA time zone, as YYYY-MM-DD. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** "2026-10-03" → "3 oct. 2026" (fr-FR). */
export function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
