import { describe, expect, it } from 'vitest'
import { safeNextFromLink, safeNextPath } from './redirect'

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

describe('safeNextFromLink', () => {
  const origin = 'https://coloc4.example'

  it('accepts paths and same-origin URLs', () => {
    expect(safeNextFromLink('/nouveau-mot-de-passe', origin)).toBe('/nouveau-mot-de-passe')
    expect(safeNextFromLink('https://coloc4.example/rejoindre', origin)).toBe('/rejoindre')
    expect(safeNextFromLink('https://coloc4.example/', origin)).toBe('/')
  })

  it.each(['https://evil.example/rejoindre', 'javascript:alert(1)', 'not a url', '//evil.example', null])(
    'falls back for %s',
    (raw) => {
      expect(safeNextFromLink(raw, origin)).toBe('/accueil')
    },
  )
})
