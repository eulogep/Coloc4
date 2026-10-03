// fast-check generators shared by domain tests (test-only module).
import fc from 'fast-check'
import { MAX_AMOUNT_MINOR } from './money'

export const memberIdArb = fc.uuid({ version: 4 })

export const memberIdsArb = (min = 1, max = 8) =>
  fc.uniqueArray(memberIdArb, { minLength: min, maxLength: max, selector: (id) => id.toLowerCase() })

export const amountArb = fc.bigInt({ min: 1n, max: MAX_AMOUNT_MINOR })
