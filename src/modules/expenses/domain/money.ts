// EUR amounts as bigint minor units (cents). No floating point anywhere (ADR-004).
import { err, ok, type Result } from './result'

export type Minor = bigint

/** 1 000 000,00 € — upper bound shared with the database CHECK (PC-11). */
export const MAX_AMOUNT_MINOR: Minor = 100_000_000n

export type ParseAmountError = 'EMPTY' | 'NOT_A_NUMBER' | 'TOO_MANY_DECIMALS' | 'NOT_POSITIVE' | 'TOO_LARGE'

const AMOUNT_RE = /^(\d+)(?:[.,](\d*))?$/

/**
 * Parses user input such as "42,37", "42.37", "80", "3,5" into cents.
 * Accepts one "," or "." decimal separator, at most two decimals. Rejects signs,
 * thousands separators, exponents and anything over MAX_AMOUNT_MINOR.
 */
export function parseEurAmount(input: string): Result<Minor, ParseAmountError> {
  const trimmed = input.trim()
  if (trimmed === '') return err('EMPTY')

  const match = AMOUNT_RE.exec(trimmed)
  if (!match) return err('NOT_A_NUMBER')
  const [, units = '', decimals = ''] = match
  if (decimals.length > 2) return err('TOO_MANY_DECIMALS')
  if (units.length > 9) return err('TOO_LARGE')

  const minor = BigInt(units) * 100n + BigInt(decimals.padEnd(2, '0'))
  if (minor <= 0n) return err('NOT_POSITIVE')
  if (minor > MAX_AMOUNT_MINOR) return err('TOO_LARGE')
  return ok(minor)
}

/** Like parseEurAmount but accepts 0 (an exact-split share may be zero; empty = 0). */
export function parseEurShare(input: string): Result<Minor, Exclude<ParseAmountError, 'NOT_POSITIVE'>> {
  if (input.trim() === '') return ok(0n)
  const parsed = parseEurAmount(input)
  if (parsed.ok) return parsed
  if (parsed.error === 'NOT_POSITIVE') return ok(0n)
  if (parsed.error === 'EMPTY') return ok(0n)
  return err(parsed.error)
}

const eurFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** 4237n → "42,37 €" (fr-FR). Formats an exact decimal string, never a float. */
export function formatEur(minor: Minor): string {
  const negative = minor < 0n
  const abs = negative ? -minor : minor
  const decimal = `${negative ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`
  return eurFormatter.format(decimal as Intl.StringNumericLiteral)
}

/** Decimal input form for editing: 4237n → "42,37". */
export function toInputString(minor: Minor): string {
  const abs = minor < 0n ? -minor : minor
  return `${minor < 0n ? '-' : ''}${abs / 100n},${(abs % 100n).toString().padStart(2, '0')}`
}

// JSON cannot carry bigint: amounts cross API boundaries as strings of minor units (§4.2).
const WIRE_RE = /^-?(0|[1-9]\d*)$/

export function minorToWire(minor: Minor): string {
  return minor.toString()
}

export function minorFromWire(wire: string): Minor {
  if (!WIRE_RE.test(wire)) throw new TypeError(`Invalid minor-unit amount: ${JSON.stringify(wire)}`)
  return BigInt(wire)
}
