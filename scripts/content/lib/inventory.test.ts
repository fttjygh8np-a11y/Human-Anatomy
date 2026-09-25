import { describe, expect, it } from 'vitest'
import { structureSchema } from '../../../src/core/schema.ts'
import { buildInventory, groupBySystem, inferKind, normalizeFmaId, normalizeLateralityValue, parseElements, sideKey } from './inventory.ts'
import { TODAY } from './test-helpers.ts'

const el = (over: Record<string, unknown>) => ({ elementId: 'FJT1', fmaId: 'FMA900001', nameEn: 'right test bone', system: 'skeletal', ...over })

describe('element parsing', () => {
  it('normalizes FMA ids, systems and laterality values', () => {
    expect(['FMA900001', 'fma:900001', 'FMA_900001', '900001', 900001].map(normalizeFmaId)).toEqual(Array(5).fill('900001'))
    expect(normalizeFmaId('abc')).toBeNull()
    expect(['R', 'sol', 'midline', 'paired_generic', 'x'].map(normalizeLateralityValue)).toEqual(['right', 'left', 'midline', 'paired_generic', null])
  })

  it('accepts field aliases and a wrapper object, and skips incomplete elements without inventing ids', () => {
    const { elements, issues } = parseElements({
      elements: [
        el({}),
        { fj: 'FJT2', fma: '900002', name: 'left test bone', systems: ['bones'], side: 'L', chunk: 'skeletal/upper_limb' },
        el({ elementId: 'FJT3', fmaId: '' }),
        el({ elementId: 'FJT4', system: 'unknown' }),
        el({ elementId: 'FJT5', fmaId: 'FMA900005', laterality: 'bilateral', kind: 'nonsense' }),
        'garbage',
      ],
    })
    expect(elements.map((e) => e.elementId)).toEqual(['FJT1', 'FJT2', 'FJT5'])
    expect(elements[1]).toMatchObject({ fmaId: '900002', systems: ['skeletal'], laterality: 'left', chunk: 'skeletal/upper_limb' })
    expect(elements[2]!.laterality).toBeUndefined()
    expect(issues).toHaveLength(5)
    expect(issues.every((i) => i.severity === 'warning' && i.code === 'inventory_input')).toBe(true)
  })

  it('rejects input that is not a list', () => {
    expect(parseElements({ foo: 1 }).elements).toEqual([])
    expect(parseElements({ foo: 1 }).issues).toHaveLength(1)
  })
})

describe('buildInventory', () => {
  const parsed = (items: Record<string, unknown>[]) => parseElements(items).elements

  it('creates draft records with only imported facts', () => {
    const { records, issues } = buildInventory(parsed([el({ chunk: 'skeletal/upper_limb' })]), { today: TODAY })
    expect(issues).toEqual([])
    const r = records[0]!
    expect(r.id).toBe('fma:900001')
    expect(r.names).toEqual({ en: { value: 'right test bone', status: 'unverified', sources: [{ sourceId: 'src:bodyparts3d', locator: 'öğe FJT1' }] } })
    expect(r.names.tr).toBeUndefined()
    expect(r.names.la).toBeUndefined()
    expect(r.laterality).toBe('right')
    expect(r.regions).toEqual(['upper_limb'])
    expect(r.kind).toBe('bone')
    expect(r.review).toEqual({ text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' })
    expect(r.provenance.createdBy).toBe('import:bodyparts3d')
    expect(r.externalIds).toEqual({ fma: '900001', bp3dRepresentation: 'FJT1' })
    expect(structureSchema.safeParse(r).success).toBe(true)
  })

  it('merges elements sharing an FMA id and warns about conflicting names', () => {
    const { records, issues } = buildInventory(parsed([el({}), el({ elementId: 'FJT9', nameEn: 'right test bone variant' })]), { today: TODAY })
    expect(records).toHaveLength(1)
    expect(records[0]!.names.en.sources?.[0]?.locator).toBe('öğe FJT1, FJT9')
    expect(issues).toHaveLength(1)
  })

  it('links right/left counterparts by name and refuses ambiguous pairs', () => {
    const { records, issues } = buildInventory(
      parsed([
        el({}),
        el({ elementId: 'FJT2', fmaId: '900002', nameEn: 'left test bone' }),
        el({ elementId: 'FJT3', fmaId: '900003', nameEn: 'right other part' }),
        el({ elementId: 'FJT4', fmaId: '900004', nameEn: 'left other part' }),
        el({ elementId: 'FJT5', fmaId: '900005', nameEn: 'left other part', laterality: 'left' }),
      ]),
      { today: TODAY },
    )
    const byId = new Map(records.map((r) => [r.id, r]))
    expect(byId.get('fma:900001')!.counterpartId).toBe('fma:900002')
    expect(byId.get('fma:900002')!.counterpartId).toBe('fma:900001')
    expect(byId.get('fma:900003')!.counterpartId).toBeUndefined()
    expect(issues.some((i) => i.message.includes('belirsiz'))).toBe(true)
  })

  it('drops regions unknown to the taxonomy and applies level hints from scope targets', () => {
    const { records } = buildInventory(parsed([el({ chunk: 'skeletal/nowhere' }), el({ elementId: 'FJT2', fmaId: '900002', regions: ['arm'] })]), {
      today: TODAY,
      knownRegions: new Set(['arm']),
      levelHints: new Map([['fma:900002', 'advanced' as const]]),
    })
    expect(records[0]!.regions).toEqual([])
    expect(records[0]!.regionBasis).toBe('unassigned')
    expect(records[1]!.regions).toEqual(['arm'])
    expect(records[1]!.detailLevel).toBe('advanced')
  })

  it('keeps provenance dates stable for unchanged records', () => {
    const first = buildInventory(parsed([el({})]), { today: '2026-01-01' }).records
    const same = buildInventory(parsed([el({})]), { today: TODAY, existing: first }).records[0]!
    expect(same.provenance).toMatchObject({ createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    const changed = buildInventory(parsed([el({ nameEn: 'right test bone renamed' })]), { today: TODAY, existing: first }).records[0]!
    expect(changed.provenance).toMatchObject({ createdAt: '2026-01-01', updatedAt: TODAY })
  })

  it('groups records by primary system', () => {
    const { records } = buildInventory(parsed([el({}), el({ elementId: 'FJT2', fmaId: '900002', nameEn: 'test muscle', system: 'muscular' })]), { today: TODAY })
    expect([...groupBySystem(records).keys()]).toEqual(['skeletal', 'muscular'])
  })
})

describe('helpers', () => {
  it('guesses kinds only from unambiguous words or the system', () => {
    expect(inferKind('left test tendon', 'muscular')).toEqual({ kind: 'tendon', basis: 'name' })
    expect(inferKind('right something', 'skeletal')).toEqual({ kind: 'bone', basis: 'system' })
    expect(inferKind('right something', 'digestive')).toEqual({ kind: 'other', basis: 'none' })
  })

  it('masks exactly one side word', () => {
    expect(sideKey('Right test bone')).toBe('* test bone')
    expect(sideKey('right and left test')).toBeNull()
    expect(sideKey('test')).toBeNull()
  })
})

describe('generic concepts from the is-a list', () => {
  const parsedEls = (items: unknown[]) => parseElements(items).elements
  const names = new Map([
    ['900100', 'test bone'],
    ['900200', 'unrelated parent'],
  ])
  const pair = [
    el({ elementId: 'FJR', fmaId: '900001', nameEn: 'Right test bone', isaParents: ['fma:900100'] }),
    el({ elementId: 'FJL', fmaId: '900002', nameEn: 'Left test bone', isaParents: ['fma:900100'] }),
  ]

  it('creates a side-less record, links both sides and inherits the scope level', () => {
    const { records } = buildInventory(parsedEls(pair), { today: TODAY, conceptNames: names, levelHints: new Map([['fma:900100', 'basic']]) })
    const generic = records.find((r) => r.id === 'fma:900100')!
    expect(generic.laterality).toBe('paired_generic')
    expect(generic.names.en.value).toBe('Test bone')
    expect(generic.detailLevel).toBe('basic')
    for (const id of ['fma:900001', 'fma:900002']) {
      const r = records.find((x) => x.id === id)!
      expect(r.genericId).toBe('fma:900100')
      expect(r.detailLevel).toBe('basic')
    }
    for (const r of records) expect(structureSchema.safeParse(r).success).toBe(true)
  })

  it('defaults unassigned levels to advanced and ignores is-a parents with another name', () => {
    const els = [el({ elementId: 'FJR', fmaId: '900001', nameEn: 'Right test bone', isaParents: ['fma:900200'] })]
    const { records } = buildInventory(parsedEls(els), { today: TODAY, conceptNames: names })
    expect(records.map((r) => r.id)).toEqual(['fma:900001'])
    expect(records[0]!.genericId).toBeUndefined()
    expect(records[0]!.detailLevel).toBe('advanced')
  })
})

describe('laterality from model position', () => {
  it('uses the observed side only when the name states none', () => {
    const els = parseElements([
      el({ elementId: 'FJM', fmaId: '900300', nameEn: 'Test vertebra', laterality: { fromName: null, observed: 'midline', offsetXM: 0 } }),
      el({ elementId: 'FJU', fmaId: '900301', nameEn: 'Test spleen', laterality: { fromName: null, observed: 'left', offsetXM: 0.1 } }),
      el({ elementId: 'FJR', fmaId: '900302', nameEn: 'Right test bone', laterality: { fromName: 'right', observed: 'left', offsetXM: 0.1 } }),
    ]).elements
    const { records } = buildInventory(els, { today: TODAY })
    const lat = Object.fromEntries(records.map((r) => [r.id, r.laterality]))
    expect(lat).toEqual({ 'fma:900300': 'midline', 'fma:900301': 'unpaired', 'fma:900302': 'right' })
  })
})


describe('part-of wholes', () => {
  const parts = parseElements([
    el({ elementId: 'FJW1', fmaId: '910001', nameEn: 'test right chamber wall', system: 'cardiovascular' }),
    el({ elementId: 'FJW2', fmaId: '910002', nameEn: 'test right chamber valve', system: 'cardiovascular' }),
    el({ elementId: 'FJW3', fmaId: '910003', nameEn: 'test left chamber wall', system: 'cardiovascular' }),
    el({ elementId: 'FJW4', fmaId: '910004', nameEn: 'test neck bone', system: 'skeletal' }),
    el({ elementId: 'FJW5', fmaId: '910005', nameEn: 'test neck bone two', system: 'skeletal' }),
  ]).elements
  const whole = (fmaId: string, name: string, elementIds: string[]) => ({ fmaId, name, elementIds, basis: 'test' })
  const wholes = [
    whole('920001', 'test heart', ['FJW1', 'FJW2', 'FJW3']),
    whole('920002', 'test right chamber', ['FJW1', 'FJW2']),
    whole('920003', 'neck', ['FJW4', 'FJW5']),
    whole('920004', 'test single', ['FJW3']),
  ]

  it('adds wholes made of several parts and nests parts under the smallest whole', () => {
    const { records } = buildInventory(parts, { today: TODAY, wholes })
    const byId = new Map(records.map((r) => [r.id, r]))
    expect(byId.get('fma:920001')).toMatchObject({ systems: ['cardiovascular'], laterality: 'unpaired' })
    expect(byId.get('fma:920002')?.parentIds).toEqual(['fma:920001'])
    expect(byId.get('fma:910001')?.parentIds).toEqual(['fma:920002'])
    expect(byId.get('fma:910003')?.parentIds).toEqual(['fma:920001'])
    for (const r of records) expect(structureSchema.safeParse(r).success).toBe(true)
  })

  it('leaves out body regions and single-part wholes', () => {
    const { records } = buildInventory(parts, { today: TODAY, wholes })
    expect(records.some((r) => r.id === 'fma:920003')).toBe(false)
    expect(records.some((r) => r.id === 'fma:920004')).toBe(false)
    expect(records.find((r) => r.id === 'fma:910004')?.parentIds).toBeUndefined()
  })
})
