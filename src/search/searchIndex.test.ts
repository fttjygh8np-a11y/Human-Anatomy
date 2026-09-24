import { describe, expect, it } from 'vitest'
import { assetSchema, structureSchema, type StructureInput } from '../core/schema.ts'
import { createContentIndex } from '../data/contentIndex.ts'
import type { ContentBundle } from '../data/types.ts'
import { editDistance, normalizeSearchText, tokenize } from './normalize.ts'
import { createSearchService, parseQuery } from './searchIndex.ts'

// Synthetic test bundle. Names are common terms used only to exercise matching; they are
// marked 'unverified' and carry no sources — this is not content.
const now = '2026-09-24'
type Names = { en: string; la?: string; tr?: string }
const names = (n: Names) => ({
  en: { value: n.en, status: 'unverified' as const },
  ...(n.la ? { la: { value: n.la, status: 'unverified' as const } } : {}),
  ...(n.tr ? { tr: { value: n.tr, status: 'unverified' as const } } : {}),
})
const s = (id: string, n: Names, extra: Partial<StructureInput> = {}) =>
  structureSchema.parse({
    id,
    schemaVersion: 1,
    kind: 'bone',
    names: names(n),
    systems: ['skeletal'],
    laterality: 'paired_generic',
    detailLevel: 'basic',
    provenance: { createdBy: 'author:human', createdAt: now, updatedAt: now },
    ...extra,
  })
const syn = (value: string, lang: 'tr' | 'la' | 'en') => ({ value, lang, kind: 'synonym' as const })

const structures = [
  s('ax:humerus', { en: 'Humerus', la: 'Humerus', tr: 'Kol kemiği' }, { regions: ['arm'], synonyms: [syn('Hümerus', 'tr')] }),
  s('ax:humerus_r', { en: 'Right humerus', la: 'Humerus dexter', tr: 'Sağ humerus' }, { regions: ['arm'], laterality: 'right', genericId: 'ax:humerus' }),
  s('ax:humerus_l', { en: 'Left humerus', la: 'Humerus sinister', tr: 'Sol humerus' }, { regions: ['arm'], laterality: 'left', genericId: 'ax:humerus' }),
  s('ax:femur', { en: 'Femur', la: 'Femur', tr: 'Uyluk kemiği' }, { regions: ['thigh'] }),
  s('ax:tibia', { en: 'Tibia', la: 'Tibia', tr: 'Tibia' }, { regions: ['leg'], synonyms: [syn('Kaval kemiği', 'tr')] }),
  s('ax:sternum', { en: 'Sternum', la: 'Sternum', tr: 'Göğüs kemiği' }, { regions: ['thorax'], laterality: 'midline', synonyms: [syn('Sternum', 'tr')] }),
  s(
    'ax:biceps',
    { en: 'Biceps brachii', la: 'Musculus biceps brachii', tr: 'Pazı kası' },
    { kind: 'muscle', systems: ['muscular'], regions: ['arm'], synonyms: [syn('İki başlı kol kası', 'tr')] },
  ),
  s('ax:eyebrow', { en: 'Eyebrow', la: 'Supercilium', tr: 'Kaş' }, { kind: 'surface_landmark', systems: ['integumentary'], regions: ['head'] }),
  s(
    'ax:rca',
    { en: 'Right coronary artery', la: 'Arteria coronaria dextra', tr: 'Sağ koroner arter' },
    { kind: 'artery', systems: ['cardiovascular'], regions: ['thorax'], laterality: 'not_applicable' },
  ),
  s(
    'ax:lca',
    { en: 'Left coronary artery', la: 'Arteria coronaria sinistra', tr: 'Sol koroner arter' },
    { kind: 'artery', systems: ['cardiovascular'], regions: ['thorax'], laterality: 'not_applicable' },
  ),
  s(
    'ax:ica',
    { en: 'Internal carotid artery', la: 'Arteria carotis interna', tr: 'İç karotis arter' },
    { kind: 'artery', systems: ['cardiovascular'], regions: ['neck'] },
  ),
  s('ax:colon', { en: 'Colon', la: 'Colon', tr: 'Kolon' }, { kind: 'organ', systems: ['digestive'], regions: ['abdomen'], laterality: 'unpaired' }),
]

const node = (n: string, structureId: string) => ({
  node: n,
  structureId,
  triangles: 1,
  bbox: [0, 0, 0, 1, 1, 1],
  centroid: [0.5, 0.5, 0.5],
})
const asset = assetSchema.parse({
  id: 'asset:test',
  file: 'models/test.glb',
  format: 'glb',
  bytes: 0,
  sourceId: 'src:test',
  coordinateFrame: 'anat-gltf-v1',
  representation: 'schematic',
  lod: 'base',
  chunk: 'test',
  systems: ['skeletal'],
  label: { tr: 'Test', en: 'Test' },
  nodes: [node('hr', 'ax:humerus_r'), node('hl', 'ax:humerus_l'), node('fe', 'ax:femur'), node('bi', 'ax:biceps'), node('rca', 'ax:rca')],
  provenance: [{ date: now, step: 'test', tool: 'vitest' }],
})

const region = (id: string, tr: string, en: string, parentId?: string) => ({
  id,
  name: { tr, en },
  order: 0,
  ...(parentId ? { parentId } : {}),
})

const bundle: ContentBundle = {
  manifest: { schemaVersion: 1, contentVersion: 't', generatedAt: now, counts: {}, files: {} },
  systems: [],
  regions: [
    region('head', 'Baş', 'Head'),
    region('neck', 'Boyun', 'Neck'),
    region('thorax', 'Göğüs', 'Thorax'),
    region('abdomen', 'Karın', 'Abdomen'),
    region('upper_limb', 'Üst ekstremite', 'Upper limb'),
    region('arm', 'Kol', 'Arm', 'upper_limb'),
    region('lower_limb', 'Alt ekstremite', 'Lower limb'),
    region('thigh', 'Uyluk', 'Thigh', 'lower_limb'),
    region('leg', 'Bacak', 'Leg', 'lower_limb'),
  ],
  structures,
  relations: [],
  sources: [],
  assets: [asset],
  lessons: [],
  questions: [],
  reviews: [],
  scope: [],
}

const svc = createSearchService(createContentIndex(bundle))
const ids = (hits: { id: string }[]) => hits.map((h) => h.id)
const top = (q: string) => svc.search(q)[0]

describe('normalization', () => {
  it('handles Turkish casing (İ/I) and folds Turkish letters', () => {
    expect(normalizeSearchText('İSTANBUL')).toBe('istanbul')
    expect(normalizeSearchText('IĞDIR')).toBe('igdir')
    expect(normalizeSearchText('KAŞ')).toBe('kas')
    expect(normalizeSearchText('kaş')).toBe(normalizeSearchText('KAS'))
    expect(normalizeSearchText('ĞÜŞİÖÇ ğüşıöç')).toBe('gusioc gusioc')
  })

  it('removes Latin/English diacritics and ligatures', () => {
    expect(normalizeSearchText('Hümerus')).toBe('humerus')
    expect(normalizeSearchText('Crème Brûlée')).toBe('creme brulee')
    expect(normalizeSearchText('vertebræ')).toBe('vertebrae')
    expect(normalizeSearchText('Œsophagus')).toBe('oesophagus')
    // Decomposed input (s + combining cedilla) folds the same way as precomposed.
    expect(normalizeSearchText('kaş')).toBe('kas')
  })

  it('tokenizes on punctuation and apostrophes', () => {
    expect(tokenize("Achilles'in tendonu")).toEqual(['achilles', 'in', 'tendonu'])
    expect(tokenize('M. biceps-brachii, caput longum')).toEqual(['m', 'biceps', 'brachii', 'caput', 'longum'])
    expect(tokenize('  ')).toEqual([])
  })

  it('computes bounded edit distance with transpositions', () => {
    expect(editDistance('humerus', 'humerus', 2)).toBe(0)
    expect(editDistance('femr', 'femur', 1)).toBe(1)
    expect(editDistance('humreus', 'humerus', 2)).toBe(1)
    expect(editDistance('abc', 'xyz', 1)).toBe(2)
    expect(editDistance('a', 'abcdef', 2)).toBe(3)
  })
})

describe('query understanding', () => {
  it('turns side words into a laterality filter and removes them from the text', () => {
    expect(parseQuery('Sol hümerus')).toEqual({ terms: ['humerus'], laterality: ['left'], sideTerms: ['sol'] })
    expect(parseQuery('SAĞ humerus')).toEqual({ terms: ['humerus'], laterality: ['right'], sideTerms: ['sag'] })
    expect(parseQuery('humerus sinister').laterality).toEqual(['left'])
    expect(parseQuery('arteria coronaria dextra').laterality).toEqual(['right'])
    expect(parseQuery('right coronary artery').terms).toEqual(['coronary', 'artery'])
  })

  it('searches a side word as text when it is the whole query', () => {
    expect(parseQuery('sol')).toEqual({ terms: ['sol'], laterality: null, sideTerms: [] })
  })

  it('is exposed on the service', () => {
    expect(svc.parseQuery?.('left humerus').laterality).toEqual(['left'])
  })
})

describe('search', () => {
  it('finds structures by Turkish, Latin and English names', () => {
    expect(top('Kol kemiği')?.id).toBe('ax:humerus')
    expect(top('Kol kemiği')?.matchedLang).toBe('tr')
    expect(top('Musculus biceps brachii')?.id).toBe('ax:biceps')
    expect(top('Musculus biceps brachii')?.matchedLang).toBe('la')
    expect(top('Internal carotid artery')?.id).toBe('ax:ica')
    expect(top('Internal carotid artery')?.matchedLang).toBe('en')
  })

  it('is case-, Turkish-character- and diacritic-insensitive', () => {
    const variants = ['kol kemiği', 'KOL KEMİĞİ', 'kol kemigi', 'Kol Kemiği']
    for (const q of variants) expect(top(q)?.id, q).toBe('ax:humerus')
    expect(ids(svc.search('humerus'))).toEqual(ids(svc.search('hümerus')))
    expect(top('INTERNAL CAROTID')?.id).toBe('ax:ica')
    for (const q of ['iç karotis', 'İÇ KAROTİS', 'IC KAROTIS', 'ic karotis']) {
      expect(top(q)?.id, q).toBe('ax:ica')
      expect(top(q)?.matchedLang, q).toBe('tr')
    }
  })

  it('treats "kas", "KAS" and "kaş" as the same query', () => {
    const base = ids(svc.search('kas'))
    expect(base[0]).toBe('ax:eyebrow')
    expect(base).toContain('ax:biceps')
    for (const q of ['KAS', 'kaş', 'KAŞ', 'Kaş']) expect(ids(svc.search(q)), q).toEqual(base)
  })

  it('reports synonym matches as such', () => {
    const hit = top('iki başlı')
    expect(hit?.id).toBe('ax:biceps')
    expect(hit?.matchedKind).toBe('synonym')
    expect(hit?.matchedLang).toBe('tr')
    expect(hit?.matchedText).toBe('İki başlı kol kası')
    expect(top('kaval kemiği')).toMatchObject({ id: 'ax:tibia', matchedKind: 'synonym' })
  })

  it('prefers names over synonyms and Turkish over equal Latin/English names', () => {
    // Latin name "Sternum" beats the identical Turkish synonym.
    expect(top('sternum')).toMatchObject({ id: 'ax:sternum', matchedKind: 'name', matchedLang: 'la' })
    // Identical TR/LA/EN names: Turkish is reported.
    expect(top('tibia')).toMatchObject({ id: 'ax:tibia', matchedKind: 'name', matchedLang: 'tr' })
    // A name containing the term outranks a synonym containing it.
    const kol = ids(svc.search('kol'))
    expect(kol.indexOf('ax:humerus')).toBeLessThan(kol.indexOf('ax:biceps'))
  })

  it('ranks exact > prefix > typo matches', () => {
    // "kol": exact token in "Kol kemiği", prefix of "Kolon".
    const kol = ids(svc.search('kol'))
    expect(kol.indexOf('ax:humerus')).toBeLessThan(kol.indexOf('ax:colon'))
    expect(kol.indexOf('ax:biceps')).toBeLessThan(kol.indexOf('ax:colon'))
    // "kolo": prefix of "Kolon", one typo away from "Kol".
    const kolo = ids(svc.search('kolo'))
    expect(kolo[0]).toBe('ax:colon')
    expect(kolo).toContain('ax:humerus')
    // "kolon": exact.
    expect(top('kolon')).toMatchObject({ id: 'ax:colon', matchedLang: 'tr' })
    const hits = svc.search('humerus')
    expect(hits[0]?.id).toBe('ax:humerus')
    for (let i = 1; i < hits.length; i++) expect(hits[i]!.score).toBeLessThanOrEqual(hits[i - 1]!.score)
  })

  it('supports prefix search', () => {
    expect(top('uyl')?.id).toBe('ax:femur')
    expect(ids(svc.search('hum')).slice(0, 3).sort()).toEqual(['ax:humerus', 'ax:humerus_l', 'ax:humerus_r'])
    expect(top('karot')?.id).toBe('ax:ica')
  })

  it('tolerates small typos', () => {
    expect(top('femr')?.id).toBe('ax:femur')
    expect(top('humreus')?.id).toBe('ax:humerus')
    expect(top('sternm')?.id).toBe('ax:sternum')
    expect(top('coronery artery')?.id).toMatch(/^ax:(rca|lca)$/)
    // Very short terms are not fuzzy-matched (too noisy).
    expect(ids(svc.search('fmr'))).toEqual([])
  })

  it('returns display data with each hit', () => {
    expect(top('pazı kası')).toEqual({
      id: 'ax:biceps',
      score: expect.any(Number),
      matchedLang: 'tr',
      matchedKind: 'name',
      matchedText: 'Pazı kası',
      nameTr: 'Pazı kası',
      nameLa: 'Musculus biceps brachii',
      nameEn: 'Biceps brachii',
      systems: ['muscular'],
      regions: ['arm'],
      laterality: 'paired_generic',
      hasModel: true,
    })
    expect(top('sternum')).toMatchObject({ laterality: 'midline', hasModel: false, regions: ['thorax'] })
  })

  it('returns nothing for empty or punctuation-only queries', () => {
    expect(svc.search('')).toEqual([])
    expect(svc.search('  ,;. ')).toEqual([])
    expect(svc.suggest('')).toEqual([])
    expect(svc.search('zzzzzzzz')).toEqual([])
  })

  it('respects the limit', () => {
    expect(svc.search('arter', { limit: 2 })).toHaveLength(2)
    expect(svc.search('arter', { limit: 0 })).toEqual([])
  })
})

describe('search filters', () => {
  it('filters by system', () => {
    expect(ids(svc.search('kol', { systems: ['muscular'] }))).toEqual(['ax:biceps'])
    expect(ids(svc.search('kol', { systems: ['digestive', 'muscular'] })).sort()).toEqual(['ax:biceps', 'ax:colon'])
  })

  it('filters by region including sub-regions', () => {
    const upper = ids(svc.search('humerus', { regions: ['upper_limb'] }))
    expect(upper.sort()).toEqual(['ax:humerus', 'ax:humerus_l', 'ax:humerus_r'])
    expect(svc.search('femur', { regions: ['upper_limb'] })).toEqual([])
    expect(ids(svc.search('kemiği', { regions: ['lower_limb'] })).sort()).toEqual(['ax:femur', 'ax:tibia'])
    expect(ids(svc.search('kemiği', { regions: ['thigh'] }))).toEqual(['ax:femur'])
  })

  it('filters by laterality', () => {
    expect(ids(svc.search('humerus', { laterality: ['right'] }))).toEqual(['ax:humerus_r'])
    expect(ids(svc.search('humerus', { laterality: ['paired_generic'] }))).toEqual(['ax:humerus'])
  })

  it('filters to structures with a 3D model', () => {
    const withModel = ids(svc.search('humerus', { withModelOnly: true }))
    expect(withModel.sort()).toEqual(['ax:humerus_l', 'ax:humerus_r'])
    expect(svc.search('sternum', { withModelOnly: true })).toEqual([])
  })
})

describe('side words in queries', () => {
  it('filters sided instances by Turkish, English and Latin side words', () => {
    for (const q of ['sol humerus', 'SOL HÜMERUS', 'left humerus', 'humerus sinister']) {
      expect(ids(svc.search(q)), q).toEqual(['ax:humerus_l'])
    }
    for (const q of ['sağ humerus', 'SAĞ HUMERUS', 'sag humerus', 'right humerus', 'humerus dexter']) {
      expect(ids(svc.search(q)), q).toEqual(['ax:humerus_r'])
    }
  })

  it('keeps unsided structures whose names carry the side word', () => {
    for (const q of ['right coronary artery', 'sağ koroner arter', 'arteria coronaria dextra']) {
      expect(ids(svc.search(q)), q).toEqual(['ax:rca'])
    }
    expect(ids(svc.search('left coronary'))).toEqual(['ax:lca'])
  })

  it('falls back to the side-independent concept when no sided instance exists', () => {
    expect(ids(svc.search('sol femur'))).toEqual(['ax:femur'])
  })

  it('searches the side word as text when it is the whole query', () => {
    const hits = ids(svc.search('sol'))
    expect(hits).toContain('ax:humerus_l')
    expect(hits).toContain('ax:lca')
    expect(hits).not.toContain('ax:humerus_r')
  })

  it('combines with explicit laterality filters', () => {
    expect(svc.search('sol humerus', { laterality: ['right'] })).toEqual([])
    expect(ids(svc.search('sol humerus', { laterality: ['left', 'right'] }))).toEqual(['ax:humerus_l'])
  })
})

describe('suggest', () => {
  it('is prefix-oriented', () => {
    expect(svc.suggest('hum').map((h) => h.id).sort()).toEqual(['ax:humerus', 'ax:humerus_l', 'ax:humerus_r'])
    expect(svc.suggest('hum')[0]?.id).toBe('ax:humerus')
    expect(svc.suggest('uy')[0]?.id).toBe('ax:femur')
    expect(svc.suggest('k')[0]?.matchedText.toLowerCase().startsWith('k')).toBe(true)
  })

  it('completes the last word of multi-word queries', () => {
    expect(svc.suggest('kol ke')[0]).toMatchObject({ id: 'ax:humerus', matchedText: 'Kol kemiği' })
    expect(svc.suggest('arteria cor').map((h) => h.id).sort()).toEqual(['ax:lca', 'ax:rca'])
  })

  it('prefers names that start with the typed text', () => {
    // "kol" also occurs inside the synonym "İki başlı kol kası".
    const kol = svc.suggest('kol')
    expect(kol[0]?.matchedText).toBe('Kol kemiği')
    expect(kol.map((h) => h.id).indexOf('ax:colon')).toBeLessThan(kol.map((h) => h.id).indexOf('ax:biceps'))
  })

  it('understands side words and respects the limit', () => {
    expect(svc.suggest('sol hum').map((h) => h.id)).toEqual(['ax:humerus_l'])
    expect(svc.suggest('a', 2)).toHaveLength(2)
    expect(svc.suggest('a', 0)).toEqual([])
  })

  it('tolerates a typo only in longer words', () => {
    expect(svc.suggest('stermum')[0]?.id).toBe('ax:sternum')
    expect(svc.suggest('humerys')[0]?.id).toBe('ax:humerus')
  })
})
