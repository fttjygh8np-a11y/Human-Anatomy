import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkFrameAxes, checkLaterality, classifyElement, measureMidline, regionTail, sideNeutralName } from './lib/classify.ts'
import { ancestorsOf, classifyRelationFile, loadRelationFiles, parseTable } from './lib/relations.ts'

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures', 'bp3d')
const ELEMENT_FMA = new Set(['9900001', '9900002', '9900003', '9900005', '9900009', '9900011', '9900012'])
const meta = { tool: 'test', date: '2026-01-01' }

describe('relation files', () => {
  it('recognises file kinds and hierarchies by name', () => {
    expect(classifyRelationFile('partof_inclusion_relation_list.txt')).toEqual({ kind: 'inclusion_relation', hierarchy: 'partof' })
    expect(classifyRelationFile('isa_element_parts.txt')).toEqual({ kind: 'element_parts', hierarchy: 'isa' })
    expect(classifyRelationFile('isa_parts_list_e.txt')).toEqual({ kind: 'parts_list', hierarchy: 'isa' })
    expect(classifyRelationFile('README.txt').kind).toBe('other')
  })

  it('parses tab tables with and without a header row', () => {
    expect(parseTable('a\tb\nFMA1\tx\n').header).toEqual(['a', 'b'])
    expect(parseTable('FMA1\tx\tFMA2\ty\n').header).toBeNull()
  })

  it('uses the header for direction and infers it from element ids when there is none', () => {
    const data = loadRelationFiles(FIXTURE_DIR, ELEMENT_FMA)
    const partof = data.files.find((f) => f.name === 'partof_inclusion_relation_list.txt')!
    const isa = data.files.find((f) => f.name === 'isa_inclusion_relation_list.txt')!
    expect(partof.direction).toBe('header')
    expect(isa.direction).toBe('inferred-from-elements')
    expect(data.parents.partof.get('9900001')).toEqual(['9900101'])
    // isa file lists the child first: FMA9900003 (left femur) is-a FMA9900200 (bone organ)
    expect(data.parents.isa.get('9900003')).toEqual(['9900200'])
    expect(data.conceptNames.get('9900200')).toBe('bone organ')
  })

  it('walks ancestors nearest first', () => {
    const data = loadRelationFiles(FIXTURE_DIR, ELEMENT_FMA)
    const anc = ancestorsOf(data, 'partof', '9900001', 'FJ9001')
    expect(anc.map((a) => [a.fmaId, a.distance])).toEqual([
      ['9900101', 1],
      ['9900100', 2],
    ])
  })

  it('returns empty data for a missing directory', () => {
    expect(loadRelationFiles(join(FIXTURE_DIR, 'does-not-exist'), new Set()).files).toEqual([])
  })
})

describe('classifyElement', () => {
  const data = loadRelationFiles(FIXTURE_DIR, ELEMENT_FMA)

  it('uses the part-of hierarchy for system and region when available', () => {
    const c = classifyElement({ name: 'left humerus', fmaId: '9900001', elementId: 'FJ9001' }, data)
    expect(c).toMatchObject({ system: 'skeletal', classificationBasis: 'hierarchy', region: 'upper_limb', regionBasis: 'hierarchy', chunk: 'skeletal/upper_limb' })
    expect(c.systemEvidence).toContain('skeletal system')
  })

  it('falls back to the is-a hierarchy (anchor "skeletal muscle organ")', () => {
    const c = classifyElement({ name: 'right biceps brachii', fmaId: '9900009', elementId: 'FJ9009' }, data)
    expect(c.system).toBe('muscular')
    expect(c.classificationBasis).toBe('hierarchy')
    expect(c.region).toBe('upper_limb')
    expect(c.regionBasis).toBe('heuristic')
  })

  it('flags keyword-based results as heuristic', () => {
    const c = classifyElement({ name: 'right sciatic nerve', fmaId: '9900008', elementId: 'FJ9008' }, data)
    expect(c).toMatchObject({ system: 'nervous', classificationBasis: 'heuristic', region: 'lower_limb', regionBasis: 'heuristic' })
  })

  it('works without relation files', () => {
    expect(classifyElement({ name: 'Left humerus', fmaId: null, elementId: null }, null)).toMatchObject({
      system: 'skeletal',
      classificationBasis: 'heuristic',
      chunk: 'skeletal/upper_limb',
    })
  })

  it('prefers vessel and nerve rules over the organ they are named after', () => {
    expect(classifyElement({ name: 'right renal artery', fmaId: null, elementId: null }, null).system).toBe('cardiovascular')
    expect(classifyElement({ name: 'left ulnar nerve', fmaId: null, elementId: null }, null).system).toBe('nervous')
    expect(classifyElement({ name: 'papillary muscle of left ventricle', fmaId: null, elementId: null }, null).system).toBe('cardiovascular')
    expect(classifyElement({ name: 'gallbladder', fmaId: null, elementId: null }, null).system).toBe('digestive')
  })

  it('leaves unknown names unclassified instead of guessing', () => {
    const c = classifyElement({ name: 'accessory element', fmaId: null, elementId: null }, null)
    expect(c).toMatchObject({ system: null, classificationBasis: 'unclassified', region: null, regionBasis: 'unassigned', chunk: null })
  })

  it('uses "other" as the chunk region when the region is unknown', () => {
    expect(classifyElement({ name: 'skin', fmaId: null, elementId: null }, null).chunk).toBe('integumentary/other')
  })

  it('does not mistake "head of humerus" or "renal pelvis" for regions', () => {
    expect(regionTail('skeleton of left upper limb')).toBe('upper limb')
    expect(regionTail('head of humerus')).toBe('humerus')
    expect(regionTail('renal pelvis')).toBe('renal pelvis')
  })
})

describe('checkFrameAxes', () => {
  it('passes for a correctly converted frame and fails when an axis is inverted', () => {
    const ok = [
      { name: 'skull', centroid: [0, 1.6, 0] as const },
      { name: 'left femur', centroid: [0.1, 0.6, 0] as const },
      { name: 'sternum', centroid: [0, 1.3, 0.08] as const },
      { name: 'fifth thoracic vertebra', centroid: [0, 1.3, -0.05] as const },
    ]
    expect(checkFrameAxes(ok, meta).map((c) => c.result)).toEqual(['pass', 'pass'])
    const flipped = ok.map((e) => ({ name: e.name, centroid: [e.centroid[0], -e.centroid[1], -e.centroid[2]] as const }))
    expect(checkFrameAxes(flipped, meta).map((c) => c.result)).toEqual(['fail', 'fail'])
  })

  it('reports partial when the comparison groups are missing', () => {
    expect(checkFrameAxes([{ name: 'liver', centroid: [0, 1, 0] }], meta).map((c) => c.result)).toEqual(['partial', 'partial'])
  })
})

describe('laterality', () => {
  const elements = [
    { name: 'left humerus', centroidX: 0.155, bboxMinX: 0.145, bboxMaxX: 0.165 },
    { name: 'right humerus', centroidX: -0.145, bboxMinX: -0.155, bboxMaxX: -0.135 },
    { name: 'left kidney', centroidX: 0.055, bboxMinX: 0.045, bboxMaxX: 0.065 },
    { name: 'right kidney', centroidX: -0.045, bboxMinX: -0.055, bboxMaxX: -0.035 },
    { name: 'sternum', centroidX: 0.005, bboxMinX: 0, bboxMaxX: 0.01 },
  ]

  it('measures the midline from left/right pairs (source data need not be centred on x = 0)', () => {
    const m = measureMidline(elements, null)
    expect(m.method).toBe('left-right-pairs')
    expect(m.pairs).toBe(2)
    expect(m.x).toBeCloseTo(0.005, 9)
    expect(measureMidline(elements, 0.1)).toEqual({ x: 0.1, method: 'override', pairs: 0 })
    expect(measureMidline([{ name: 'sternum', centroidX: 0, bboxMinX: -0.02, bboxMaxX: 0.04 }], null)).toMatchObject({
      method: 'overall-bbox-center',
      x: 0.01,
    })
  })

  it('pairs names regardless of the position of the side word', () => {
    expect(sideNeutralName('Right fifth rib')).toBe(sideNeutralName('left fifth rib'))
  })

  it('passes, fails and reports partial results without correcting anything', () => {
    const midline = measureMidline(elements, null)
    expect(checkLaterality('left humerus', 0.155, midline, 0.002, meta).check?.result).toBe('pass')
    expect(checkLaterality('right humerus', -0.145, midline, 0.002, meta).check?.result).toBe('pass')
    const wrong = checkLaterality('left femur', -0.12, midline, 0.002, meta)
    expect(wrong.check?.result).toBe('fail')
    expect(wrong.observed).toBe('right')
    expect(wrong.fromName).toBe('left')
    expect(wrong.check?.details).toMatch(/UYUMSUZLUK/)
    expect(checkLaterality('left thing', 0.006, midline, 0.002, meta).check?.result).toBe('partial')
    expect(checkLaterality('sternum', 0.005, midline, 0.002, meta).check).toBeNull()
  })
})
