import { describe, expect, it } from 'vitest'
import { safeNextPath } from './redirect'

describe('safeNextPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeNextPath('/rejoindre')).toBe('/rejoindre')
  })

  it.each([null, undefined, '', 'accueil', 'https://evil.example', '//evil.example', '/\\evil.example'])(
    'falls back for %s',
    (raw) => {
      expect(safeNextPath(raw)).toBe('/accueil')
    },
  )
})
