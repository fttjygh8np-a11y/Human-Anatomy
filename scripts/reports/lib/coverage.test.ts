import { describe, expect, it } from 'vitest'
import { compileContent } from '../../content/lib/compile.ts'
import { baseFiles, file, rawAsset, rawStructure } from '../../content/lib/test-helpers.ts'
import { computeCoverage, renderCoverageMarkdown } from './coverage.ts'

const expert = { name: 'Test Uzman', role: 'anatomy_expert' }
const verifiedName = (v: string) => ({ value: v, status: 'verified', sources: [{ sourceId: 'src:terms', locator: 'TA2 0000' }] })
const present = { status: 'present', value: 'metin', verification: 'source_checked', sources: [{ sourceId: 'src:book', locator: 's. 1' }] }
const approved = { text: 'approved', labels: 'approved', geometry: 'approved', relations: 'approved' }

const target = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  system: 'skeletal',
  region: 'arm',
  kind: 'bone',
  level: 'basic',
  name: { en: id },
  laterality: 'paired_generic',
  basis: [{ sourceId: 'src:terms' }],
  ...over,
})

function coverage(extra: ReturnType<typeof file>[], assets: unknown[] = [], verifiedLicense = false) {
  const files = [...baseFiles(), ...extra]
  if (verifiedLicense) {
    const i = files.findIndex((f) => f.path === 'sources/models.json')
    const src = files[i]!.data as { license: Record<string, unknown> }
    files[i] = file('sources/models.json', { ...src, license: { ...src.license, verifiedAt: { url: 'https://example.org/license', date: '2026-09-24' } } })
  }
  const { content } = compileContent({ files, assets: file('public/data/assets.json', assets) })
  return computeCoverage(content, { generatedAt: '2026-09-24T00:00:00Z', contentVersion: 'test' })
}

describe('computeCoverage', () => {
  it('counts targets without inventory records as incomplete', () => {
    const r = coverage([file('scope/s.json', [target('hedef:a')])])
    expect(r.totals.total).toBe(1)
    expect(r.totals.done.inventory).toBe(0)
    expect(r.targets[0]!.contentMissing).toEqual(['summary', 'description', 'location'])
    expect(r.byRegion[0]!.key).toBe('upper_limb')
  })

  it('requires both sides for paired concepts and ignores schematic models', () => {
    const structures = file('structures/s.json', [
      rawStructure('fma:900000', { laterality: 'paired_generic' }),
      rawStructure('fma:900001', { laterality: 'right', genericId: 'fma:900000', counterpartId: 'fma:900002' }),
      rawStructure('fma:900002', { laterality: 'left', genericId: 'fma:900000', counterpartId: 'fma:900001' }),
    ])
    const scope = file('scope/s.json', [target('hedef:a', { structureId: 'fma:900000' })])
    const right = rawAsset('asset:r', [{ node: 'n1', structureId: 'fma:900001', x: -0.2 }])
    const leftSchematic = rawAsset('asset:l', [{ node: 'n2', structureId: 'fma:900002', x: 0.2 }], { representation: 'schematic' })
    const left = rawAsset('asset:l2', [{ node: 'n3', structureId: 'fma:900002', x: 0.2 }])

    const partial = coverage([structures, scope], [right, leftSchematic]).targets[0]!
    expect(partial.model).toBe('partial')
    expect(partial.modelSides).toEqual({ right: true, left: false })
    expect(partial.license).toBe('recorded')

    const full = coverage([structures, scope], [right, left]).targets[0]!
    expect(full.model).toBe('complete')
    expect(full.done.model).toBe(true)
    expect(full.done.complete).toBe(false)
  })

  it('marks a target complete only when every dimension is complete', () => {
    const struct = (id: string, over: Record<string, unknown>) =>
      rawStructure(id, {
        names: { en: verifiedName('test'), la: verifiedName('test'), tr: verifiedName('test') },
        content: { summary: present, description: present, location: { status: 'not_applicable' } },
        review: approved,
        ...over,
      })
    const structures = file('structures/s.json', [struct('ax:bone', { laterality: 'midline' })])
    const scope = file('scope/s.json', [target('hedef:a', { structureId: 'ax:bone', laterality: 'midline' })])
    const reviews = file(
      'reviews/r.json',
      (['text', 'labels', 'geometry', 'relations'] as const).map((aspect) => ({ id: `rev:${aspect}`, target: { type: 'structure', id: 'ax:bone' }, aspect, status: 'approved', reviewer: expert, date: '2026-09-20' })),
    )
    const asset = rawAsset('asset:a', [{ node: 'n1', structureId: 'ax:bone' }])

    const unverifiedLicense = coverage([structures, scope, reviews], [asset]).targets[0]!
    expect(unverifiedLicense.done).toMatchObject({ inventory: true, model: true, labels: true, content: true, review: true, license: false, complete: false })

    const report = coverage([structures, scope, reviews], [asset], true)
    expect(report.targets[0]!.done.complete).toBe(true)
    expect(report.totals.done.complete).toBe(1)
    expect(report.reviews.byRole).toEqual({ anatomy_expert: 4 })
  })

  it('renders a Turkish markdown report', () => {
    const md = renderCoverageMarkdown(coverage([file('scope/s.json', [target('hedef:a'), target('hedef:b', { level: 'advanced' })])]))
    expect(md).toContain('# Kapsam raporu')
    expect(md).toContain('uzmanı incelemesinin yerine geçmez')
    expect(md).toContain('0/2 (%0)')
    expect(md).toContain('| İleri |')
  })
})
