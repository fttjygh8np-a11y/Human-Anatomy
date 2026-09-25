import { describe, expect, it } from 'vitest'
import { buildOverlay, indexTa2, matchTa2, type StructureLike, type Ta2Term } from './terminology.ts'

// Placeholder terms shaped like the TA2 list (ids and wording are test data, not citations).
const terms: Ta2Term[] = [
  { id: 1, term: { la: 'os testi', en: 'test bone' } },
  { id: 2, term: { la: 'musculus testis', en: 'tester muscle' }, synonyms: { la: ['musculus probationis'] } },
  { id: 3, term: { la: 'atrium testis dextrum', en: 'right test atrium' } },
  { id: 4, term: { la: 'truncus coeliacus testis', en: 'coeliac test trunk' } },
  { id: 5, term: { la: 'ambiguum A', en: 'twin' } },
  { id: 6, term: { la: 'ambiguum B', en: 'twin' } },
]
const idx = indexTa2(terms)
const st = (id: string, en: string, laterality = 'not_applicable', kind = 'other', fma?: string): StructureLike => ({
  id,
  names: { en: { value: en } },
  laterality,
  kind,
  externalIds: fma ? { fma } : {},
})

describe('matchTa2', () => {
  it('prefers a single Wikidata TA2 link', () => {
    const m = matchTa2(st('fma:1', 'Something else', 'not_applicable', 'other', '100'), idx, new Map([['100', ['2']]]))
    expect(m?.term.id).toBe(2)
    expect(m?.basis).toBe('wikidata')
  })

  it('strips side words only for sided instances and adds kind suffixes', () => {
    expect(matchTa2(st('fma:2', 'Right test', 'right', 'bone'), idx, new Map())?.term.id).toBe(1)
    expect(matchTa2(st('fma:3', 'Left tester', 'left', 'muscle'), idx, new Map())?.term.id).toBe(2)
    // "right" is part of the name of an unsided structure: must not be stripped.
    expect(matchTa2(st('fma:4', 'Right test atrium'), idx, new Map())?.term.id).toBe(3)
  })

  it('handles American spelling and refuses ambiguous terms', () => {
    expect(matchTa2(st('fma:5', 'Celiac test trunk'), idx, new Map())?.term.id).toBe(4)
    expect(matchTa2(st('fma:6', 'Twin'), idx, new Map())).toBeNull()
  })
})

describe('buildOverlay', () => {
  it('writes unverified names with TA2/TDK locators and adds the side to Turkish names', () => {
    const s = st('fma:7', 'Right test', 'right', 'bone')
    const m = matchTa2(s, idx, new Map())!
    const o = buildOverlay(s, m, { madde: 'deneme kemiği', maddeId: '42', definition: 'Deneme tanımı' }, { ta2Url: 'https://example.org/', date: '2026-01-01' })
    const names = o.names as Record<string, { value: string; status: string; sources: { sourceId: string; locator: string }[] }>
    expect(names.la).toMatchObject({ value: 'os testi', status: 'unverified', sources: [{ sourceId: 'src:fipat-ta2', locator: 'TA2 ID 1' }] })
    expect(names.tr).toMatchObject({ value: 'Sağ deneme kemiği', status: 'unverified', sources: [{ sourceId: 'src:tdk-gts' }] })
    expect(o.externalIds).toEqual({ ta2: '1' })
  })

  it('adds no Turkish name without TDK evidence', () => {
    const s = st('fma:8', 'Tester', 'not_applicable', 'muscle')
    const o = buildOverlay(s, matchTa2(s, idx, new Map())!, undefined, { ta2Url: 'u', date: 'd' })
    expect((o.names as Record<string, unknown>).tr).toBeUndefined()
    expect(o.synonyms).toEqual([{ value: 'musculus probationis', lang: 'la', kind: 'synonym', sources: [{ sourceId: 'src:fipat-ta2', locator: 'TA2 ID 2' }] }])
  })
})
