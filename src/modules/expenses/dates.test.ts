import { describe, expect, it } from 'vitest'
import { formatDay, todayIn } from './dates'

describe('dates', () => {
  it('computes today in the household time zone', () => {
    const lateEvening = new Date('2026-10-03T22:30:00Z')
    expect(todayIn('Europe/Paris', lateEvening)).toBe('2026-10-04')
    expect(todayIn('America/New_York', lateEvening)).toBe('2026-10-03')
  })

  it('formats a calendar day in French without shifting it', () => {
    expect(formatDay('2026-10-03')).toBe('3 oct. 2026')
    expect(formatDay('2026-01-01')).toBe('1 janv. 2026')
  })
})
