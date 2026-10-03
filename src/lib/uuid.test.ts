import { describe, expect, it } from 'vitest'
import { isUuid } from './uuid'

describe('isUuid', () => {
  it('accepts canonical lowercase UUIDs', () => {
    expect(isUuid('4f1c2e8a-9b3d-4c5e-8f7a-1b2c3d4e5f60')).toBe(true)
  })

  it.each(['', 'nope', '4F1C2E8A-9B3D-4C5E-8F7A-1B2C3D4E5F60', '4f1c2e8a9b3d4c5e8f7a1b2c3d4e5f60', null, 42])(
    'rejects %s',
    (value) => {
      expect(isUuid(value)).toBe(false)
    },
  )
})
