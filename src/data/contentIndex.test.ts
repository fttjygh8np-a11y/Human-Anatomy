import { describe, expect, it } from 'vitest'
import { assetSchema, structureSchema, type StructureInput } from '../core/schema.ts'
import { initialSceneState } from '../state/sceneStore.ts'
import { createContentIndex } from './contentIndex.ts'
import type { ContentBundle } from './types.ts'

const now = '2026-09-24'
const s = (id: string, en: string, parentIds: string[] = [], extra: Partial<StructureInput> = {}) =>
  structureSchema.parse({
    id,
    schemaVersion: 1,
    kind: 'bone',
    names: { en: { value: en, status: 'unverified' } },
    systems: ['skeletal'],
    laterality: 'not_applicable',
    parentIds,
    detailLevel: 'basic',
    provenance: { createdBy: 'author:human', createdAt: now, updatedAt: now },
    ...extra,
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
  chunk: 'skeletal/test',
  systems: ['skeletal'],
  label: { tr: 'Test', en: 'Test' },
  nodes: [
    { node: 'n1', structureId: 'ax:leaf1', triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [0.5, 0.5, 0.5] },
    { node: 'n2', structureId: 'ax:leaf2', triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [0.5, 0.5, 0.5] },
    { node: 'n3', structureId: 'ax:right', triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [0.5, 0.5, 0.5] },
  ],
  provenance: [{ date: now, step: 'test', tool: 'vitest' }],
})

const bundle: ContentBundle = {
  manifest: { schemaVersion: 1, contentVersion: 't', generatedAt: now, counts: {}, files: {} },
  systems: [],
  regions: [
    { id: 'upper_limb', name: { tr: 'Üst ekstremite', en: 'Upper limb' }, order: 0 },
    { id: 'arm', parentId: 'upper_limb', name: { tr: 'Kol', en: 'Arm' }, order: 1 },
  ],
  structures: [
    s('ax:root', 'Root'),
    s('ax:mid', 'Mid', ['ax:root']),
    s('ax:leaf1', 'Leaf one', ['ax:mid'], { regions: ['arm'], names: { en: { value: 'Leaf one', status: 'unverified' }, tr: { value: 'Yaprak bir', status: 'unverified' } } }),
    s('ax:leaf2', 'Leaf two', ['ax:mid'], { names: { en: { value: 'Leaf two', status: 'unverified' }, la: { value: 'folium secundum', status: 'unverified' } } }),
    s('ax:nomodel', 'No model', ['ax:root']),
    s('ax:generic', 'Generic'),
    s('ax:right', 'Right generic', [], { laterality: 'right', genericId: 'ax:generic' }),
  ],
  relations: [],
  sources: [],
  assets: [asset],
  lessons: [],
  questions: [],
  reviews: [],
  scope: [],
}

describe('contentIndex', () => {
  const idx = createContentIndex(bundle)

  it('resolves ancestors nearest first', () => {
    expect(idx.ancestorsOf('ax:leaf1')).toEqual(['ax:mid', 'ax:root'])
  })

  it('collects model nodes of descendants', () => {
    expect(idx.nodesFor('ax:root').map((n) => n.node).sort()).toEqual(['n1', 'n2'])
    expect(idx.hasModel('ax:nomodel')).toBe(false)
    expect(idx.structureForNode('asset:test', 'n2')).toBe('ax:leaf2')
  })

  it('checks loaded state against scene', () => {
    const scene = initialSceneState()
    expect(idx.isLoaded('ax:mid', scene)).toBe(false)
    expect(idx.isLoaded('ax:mid', { ...scene, loadedAssets: ['asset:test'] })).toBe(true)
  })

  it('includes sub-regions and falls back to English names', () => {
    expect(idx.structuresInRegion('upper_limb').map((x) => x.id)).toEqual(['ax:leaf1'])
    expect(idx.displayName('ax:leaf1')).toBe('Yaprak bir')
    expect(idx.displayName('ax:leaf2')).toBe('Folium secundum')
    expect(idx.nameLanguage('ax:leaf2')).toBe('la')
    expect(idx.nameLanguage('ax:mid')).toBe('en')
    expect(idx.displayName('ax:leaf2', 'en')).toBe('Leaf two')
    expect(idx.displayName('ax:mid')).toBe('Mid')
  })

  it('lists system roots', () => {
    expect(idx.systemRoots('skeletal').map((x) => x.id)).toEqual(['ax:generic', 'ax:root'])
  })

  it('treats a generic concept as the parent of its sided instances', () => {
    expect(idx.childrenOf('ax:generic').map((x) => x.id)).toEqual(['ax:right'])
    expect(idx.ancestorsOf('ax:right')).toEqual(['ax:generic'])
    expect(idx.hasModel('ax:generic')).toBe(true)
    expect(idx.nodesFor('ax:generic').map((n) => n.node)).toEqual(['n3'])
  })
})
