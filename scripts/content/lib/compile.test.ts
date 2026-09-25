import { describe, expect, it } from 'vitest'
import { classifyContentPath, compileContent } from './compile.ts'
import { mergeOverlay } from './merge.ts'
import { codes, compileWith, file, rawAsset, rawStructure } from './test-helpers.ts'

describe('mergeOverlay', () => {
  it('merges objects recursively, replaces arrays and removes keys set to null', () => {
    const base = { a: 1, names: { en: { value: 'x' } }, list: [1, 2], gone: 'yes' }
    const overlay = { names: { tr: { value: 'y' } }, list: [3], gone: null }
    expect(mergeOverlay(base, overlay)).toEqual({ a: 1, names: { en: { value: 'x' }, tr: { value: 'y' } }, list: [3] })
  })
})

describe('classifyContentPath', () => {
  it('maps content paths to collections', () => {
    expect(classifyContentPath('taxonomy/systems.json')).toBe('systems')
    expect(classifyContentPath('structures/_inventory/skeletal.json')).toBe('inventory')
    expect(classifyContentPath('structures/upper_limb/x.json')).toBe('structures')
    expect(classifyContentPath('scope/a.json')).toBe('scope')
    expect(classifyContentPath('taxonomy/other.json')).toBeNull()
    expect(classifyContentPath('misc/x.json')).toBeNull()
  })
})

describe('compileContent', () => {
  it('produces an empty but valid result without any input', () => {
    const { content, issues } = compileContent({ files: [] })
    expect(issues).toEqual([])
    expect(content.structures).toEqual([])
    expect(content.systems).toEqual([])
  })

  it('flattens authored taxonomy names to the core contract', () => {
    const { content, issues } = compileWith()
    expect(issues).toEqual([])
    expect(content.systems[0]).toEqual({ id: 'skeletal', name: { tr: 'İskelet test', en: 'Skeletal test' }, color: '#aabbcc', layerOrder: 0 })
    expect(content.regions.find((r) => r.id === 'arm')?.parentId).toBe('upper_limb')
    expect(content.authoredSystems[0]?.names.tr.status).toBe('unverified')
  })

  it('merges authored overlays onto inventory drafts', () => {
    const { content, issues } = compileWith(
      file('structures/_inventory/skeletal.json', [rawStructure('fma:900001', { provenance: { createdBy: 'import:bodyparts3d', createdAt: '2026-01-01', updatedAt: '2026-01-01' } })]),
      file('structures/upper_limb/test.json', {
        id: 'fma:900001',
        names: { tr: { value: 'test kemik', status: 'unverified', sources: [{ sourceId: 'src:book' }] } },
        regions: ['arm'],
      }),
    )
    expect(issues).toEqual([])
    const s = content.structures[0]!
    expect(s.names.en.value).toBe('test fma:900001')
    expect(s.names.tr?.value).toBe('test kemik')
    expect(s.regions).toEqual(['arm'])
    expect(s.provenance.createdBy).toBe('import:bodyparts3d')
    expect(content.origins.get('structure:fma:900001')).toEqual(['content/structures/_inventory/skeletal.json', 'content/structures/upper_limb/test.json'])
  })

  it('reports schema errors in Turkish with file and record id', () => {
    const { content, issues } = compileWith(file('structures/bad.json', [{ id: 'fma:900009', kind: 'bone' }]))
    expect(content.structures).toEqual([])
    expect(codes(issues)).toEqual(['schema'])
    expect(issues[0]!.file).toBe('content/structures/bad.json')
    expect(issues[0]!.recordId).toBe('fma:900009')
    expect(issues[0]!.message).toMatch(/Geçersiz|geçersiz/)
  })

  it('rejects duplicate ids, records without id and malformed files', () => {
    const { issues } = compileWith(
      file('sources/dup.json', [{ id: 'src:book', type: 'textbook', citation: 'x', shortLabel: 'x', license: { id: 'x', allowsUse: true, allowsModification: true, allowsRedistribution: true } }]),
      file('structures/noid.json', [{ kind: 'bone' }]),
      file('relations/bad.json', 'not a record'),
      file('notes/readme.json', {}),
    )
    expect(codes(issues, 'error').sort()).toEqual(['duplicate_id', 'file_format', 'overlay_without_id'])
    expect(codes(issues, 'warning')).toEqual(['unknown_file'])
  })

  it('accepts assets as an array or { assets } and validates them', () => {
    const asset = rawAsset('asset:test', [{ node: 'n1', structureId: 'fma:900001' }])
    const a = compileContent({ files: [], assets: file('public/data/assets.json', [asset]) })
    const b = compileContent({ files: [], assets: file('public/data/assets.json', { assets: [asset] }) })
    expect(a.content.assets).toHaveLength(1)
    expect(b.content.assets).toHaveLength(1)
    const bad = compileContent({ files: [], assets: file('public/data/assets.json', [{ ...asset, coordinateFrame: 'other' }]) })
    expect(codes(bad.issues)).toEqual(['schema'])
  })
})
