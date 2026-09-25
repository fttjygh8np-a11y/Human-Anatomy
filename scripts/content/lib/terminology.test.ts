import { describe, expect, it } from 'vitest'
import { buildOverlay, deriveLatin, indexTa2, matchTa2, usableTrLabel, wikidataTrName, type StructureLike, type Ta2Term } from './terminology.ts'

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

describe('Wikidata Turkish labels', () => {
  it('rejects untranslated English copies and literal machine translations', () => {
    expect(usableTrLabel('Right superior gluteal vein', 'Right superior gluteal vein')).toBe(false)
    expect(usableTrLabel('Deneme arterinin kendisi', 'Test artery proper')).toBe(false)
    expect(usableTrLabel('Humerus', 'Humerus')).toBe(true)
    expect(usableTrLabel('Koltuk altı atardamarı', 'Axillary artery')).toBe(true)
  })

  it('adds the side to a generic label and cites the Wikidata item', () => {
    const s = st('fma:9', 'Right test', 'right', 'bone')
    const n = wikidataTrName(s, { item: 'Q1', label: 'Deneme kemiği', composed: true }) as { value: string; sources: { sourceId: string; locator: string }[] }
    expect(n.value).toBe('Sağ deneme kemiği')
    expect(n.sources[0]).toMatchObject({ sourceId: 'src:wikidata', locator: 'Q1 (Türkçe etiket)' })
  })
})


// Terms below mirror the TA2 list's wording for the rules under test; they are test fixtures.
describe('TA2 name derivation', () => {
  const ta2 = indexTa2([
    { id: 1032, term: { la: 'vertebra cervicalis', en: 'cervical vertebra' } },
    { id: 1059, term: { la: 'vertebra thoracica', en: 'thoracic vertebra' } },
    { id: 1118, term: { la: 'costa', en: 'rib' } },
    { id: 1279, term: { la: 'phalanx distalis manus', en: 'distal phalanx of hand' } },
    { id: 1278, term: { la: 'phalanx media manus', en: 'middle phalanx of hand' } },
    { id: 151, term: { la: 'pollex', en: 'thumb' } },
    { id: 152, term: { la: 'index', en: 'index finger' } },
    { id: 4211, term: { la: 'truncus coeliacus', en_US: 'celiac trunk', en_GB: 'coeliac trunk' } },
    { id: 4000, term: { la: 'arteria thoracoacromialis', en: 'thoraco-acromial artery' } },
    { id: 4001, term: { la: 'ramus deltoideus', en: 'deltoid branch' }, parent: 4000 },
    { id: 5000, term: { la: 'arteria profunda brachii', en: 'deep artery of arm' } },
    { id: 5001, term: { la: 'ramus deltoideus', en: 'deltoid branch' }, parent: 5000 },
    { id: 6000, term: { la: 'venae obturatoriae', en: 'obturator veins' } },
    { id: 7000, term: { la: 'bronchus segmentalis basalis medialis pulmonis dextri', en: 'medial basal segmental bronchus of right lung' } },
  ])
  const s = (en: string, extra: Partial<StructureLike> = {}): StructureLike => ({ id: 'x', names: { en: { value: en } }, laterality: 'unpaired', kind: 'other', externalIds: {}, ...extra })

  it('derives numbered vertebrae and ribs with roman numerals', () => {
    expect(deriveLatin('Fourth cervical vertebra', ta2)?.la).toBe('vertebra cervicalis IV')
    expect(deriveLatin('Eighth cervical vertebra', ta2)).toBeNull()
    expect(deriveLatin('Right seventh rib', ta2)?.la).toBe('costa VII')
    expect(deriveLatin('First rib', ta2)).toBeNull()
  })

  it('derives digit-specific phalanges and refuses impossible ones', () => {
    expect(deriveLatin('Distal phalanx of left index finger', ta2)?.la).toBe('phalanx distalis indicis')
    expect(deriveLatin('Distal phalanx of thumb', ta2)?.ta2Ids).toEqual([1279, 151])
    expect(deriveLatin('Middle phalanx of thumb', ta2)).toBeNull()
  })

  it('reads US/UK English terms and plural group terms', () => {
    expect(matchTa2(s('Celiac trunk'), ta2, new Map())?.term.id).toBe(4211)
    expect(matchTa2(s('Right obturator vein', { laterality: 'right', kind: 'vein' }), ta2, new Map())?.term.id).toBe(6000)
  })

  it('accepts "A of B" only when A is listed under B', () => {
    const m = matchTa2(s('Deltoid branch of thoraco-acromial artery', { kind: 'artery' }), ta2, new Map())
    expect(m?.term.id).toBe(4001)
    expect(m?.basis).toBe('hierarchy')
  })

  it('reorders sided lung segments to the TA2 form', () => {
    expect(matchTa2(s('Right medial basal segmental bronchial tree', { laterality: 'right' }), ta2, new Map())?.term.id).toBe(7000)
  })
})
