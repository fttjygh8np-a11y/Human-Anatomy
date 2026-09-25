/**
 * In-memory fixtures for the content pipeline tests. Ids and names are deliberately
 * artificial (fma:9000xx, "test bone") so fixtures never read as anatomical claims.
 */
import type { StructureInput } from '../../../src/core/schema.ts'
import { compileContent, type CompileResult, type ContentFile } from './compile.ts'
import { checkIntegrity } from './integrity.ts'
import type { Issue, IssueCode, Severity } from './issues.ts'

export const TODAY = '2026-09-24'

export const file = (path: string, data: unknown): ContentFile => ({ path, data })

export function rawSource(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    type: 'textbook',
    citation: `Test kaynağı ${id}`,
    shortLabel: id,
    license: { id: 'CC-BY-4.0', allowsUse: true, allowsModification: true, allowsRedistribution: true },
    ...over,
  }
}

/** Raw (unparsed) structure JSON; `over` is loosely typed so tests can also build invalid input. */
export function rawStructure(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  const base: StructureInput = {
    id,
    schemaVersion: 1,
    kind: 'bone',
    names: { en: { value: `test ${id}`, status: 'unverified', sources: [] } },
    systems: ['skeletal'],
    laterality: 'not_applicable',
    detailLevel: 'basic',
    provenance: { createdBy: 'author:human', createdAt: TODAY, updatedAt: TODAY },
  }
  return { ...base, ...over }
}

const name = (v: string) => ({ value: v, status: 'unverified' as const, sources: [] })

/** Sources, a minimal region tree and one system record. */
export function baseFiles(): ContentFile[] {
  return [
    file('sources/book.json', rawSource('src:book', { type: 'textbook' })),
    file('sources/terms.json', rawSource('src:terms', { type: 'terminology' })),
    file('sources/models.json', rawSource('src:models', { type: 'model_library' })),
    file('taxonomy/regions.json', [
      { id: 'upper_limb', names: { tr: name('Üst test'), en: name('Upper test') }, order: 0 },
      { id: 'arm', parentId: 'upper_limb', names: { tr: name('Kol test'), en: name('Arm test') }, order: 0 },
    ]),
    file('taxonomy/systems.json', [{ id: 'skeletal', names: { tr: name('İskelet test'), en: name('Skeletal test') }, color: '#aabbcc', layerOrder: 0 }]),
  ]
}

export function compileWith(...extra: ContentFile[]): CompileResult {
  return compileContent({ files: [...baseFiles(), ...extra] })
}

/** Drops the taxonomy-completeness warnings every small fixture triggers. */
const relevant = (issues: readonly Issue[]) =>
  issues.filter((i) => i.code !== 'missing_system_record' && !(i.code === 'region_tree' && i.severity === 'warning'))

/** Compile + integrity over base files plus `extra`. */
export function checkWith(...extra: ContentFile[]): { result: CompileResult; issues: Issue[] } {
  const result = compileWith(...extra)
  return { result, issues: relevant([...result.issues, ...checkIntegrity(result.content)]) }
}

/** Same as checkWith, with a model asset catalogue (public/data/assets.json). */
export function checkWithAssets(assets: unknown[], ...extra: ContentFile[]): { result: CompileResult; issues: Issue[] } {
  const result = compileContent({ files: [...baseFiles(), ...extra], assets: file('public/data/assets.json', assets) })
  return { result, issues: relevant([...result.issues, ...checkIntegrity(result.content)]) }
}

export function codes(issues: readonly Issue[], severity?: Severity): IssueCode[] {
  return issues.filter((i) => !severity || i.severity === severity).map((i) => i.code)
}

export function rawAsset(id: string, nodes: { node: string; structureId: string; x?: number }[], over: Record<string, unknown> = {}) {
  return {
    id,
    file: `models/${id}.glb`,
    format: 'glb',
    bytes: 1,
    sourceId: 'src:models',
    coordinateFrame: 'anat-gltf-v1',
    representation: 'anatomical',
    lod: 'base',
    chunk: 'skeletal/upper_limb',
    systems: ['skeletal'],
    label: { tr: 'Test', en: 'Test' },
    nodes: nodes.map((n) => ({ node: n.node, structureId: n.structureId, triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [n.x ?? 0, 0, 0] })),
    provenance: [{ date: TODAY, step: 'test', tool: 'vitest' }],
    ...over,
  }
}
