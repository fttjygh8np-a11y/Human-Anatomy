/**
 * End-to-end: runs the model build on the SYNTHETIC fixtures (plus two generated spheres) into a temp
 * directory and checks the outputs against the app contracts.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Node as GltfNode } from '@gltf-transform/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { bp3dToApp } from '../../src/core/frame.ts'
import { assetSchema, sourceSchema } from '../../src/core/schema.ts'
import type { ModelAsset } from '../../src/core/schema.ts'
import { DEFAULT_CONFIG, resolveConfig } from './config.ts'
import { sphereObj } from './fixtures/synthetic.ts'
import { createIO } from './lib/glb.ts'
import { inventorySchema } from './lib/inventory.ts'
import type { Inventory } from './lib/inventory.ts'
import { buildModels } from './lib/pipeline.ts'
import type { BuildResult } from './lib/pipeline.ts'
import { BP3D_SOURCE } from './lib/source.ts'
import { sha256 } from './lib/util.ts'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'bp3d')
const DATE = '2026-01-15'

const config = resolveConfig({
  lod: { base: { defaultTriangleBudget: 1500 } },
  protected: [...DEFAULT_CONFIG.protected, { pattern: '\\bgallbladder\\b', reason: 'test: korunan küçük öğe' }],
})

let root = ''
let input = ''
let result: BuildResult

function outDirs(name: string) {
  return {
    modelsDir: join(root, name, 'public', 'models', 'bp3d'),
    dataDir: join(root, name, 'public', 'data'),
    inventoryDir: join(root, name, 'vendor'),
  }
}

async function run(name: string): Promise<BuildResult> {
  return buildModels({ inputDir: input, ...outDirs(name), modelsUrlPrefix: 'models/bp3d/', date: DATE, config })
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

async function readGlb(file: string) {
  const io = await createIO()
  return io.readBinary(new Uint8Array(readFileSync(file)))
}

/** World-space vertex positions of a node (dequantized through the node transform). */
function worldPositions(node: GltfNode): [number, number, number][] {
  const m = node.getWorldMatrix()
  const pos = node.getMesh()!.listPrimitives()[0]!.getAttribute('POSITION')!
  const out: [number, number, number][] = []
  const v = [0, 0, 0]
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v)
    const [x, y, z] = v as [number, number, number]
    out.push([m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]])
  }
  return out
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'bp3d-build-'))
  input = join(root, 'input')
  cpSync(FIXTURES, input, { recursive: true })
  const objDir = join(input, 'isa_BP3D_4.0_obj_99')
  // Dense meshes (generated, not committed) to exercise simplification and protection.
  writeFileSync(join(objDir, 'FJ9013.obj'), sphereObj({ elementId: 'FJ9013', fmaId: '9900013', name: 'liver', style: 'keyed' }, [-60, -20, 1050], 80, 40, 80))
  writeFileSync(
    join(objDir, 'FJ9014.obj'),
    sphereObj({ elementId: 'FJ9014', fmaId: '9900014', name: 'gallbladder', style: 'bare' }, [-40, -60, 1000], 15, 12, 20),
  )
  // A stale GLB from an "earlier build" must be removed.
  mkdirSync(outDirs('a').modelsDir, { recursive: true })
  writeFileSync(join(outDirs('a').modelsDir, 'stale.old.glb'), 'x')
  result = await run('a')
}, 60_000)

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('models:build on synthetic fixtures', () => {
  it('writes assets.json that validates against assetSchema, with matching files and hashes', () => {
    const { dataDir, modelsDir } = outDirs('a')
    const assets = z.array(assetSchema).parse(readJson(join(dataDir, 'assets.json')))
    expect(assets.length).toBeGreaterThan(0)
    expect(assets.map((a) => a.id)).toEqual([...assets.map((a) => a.id)].sort((x, y) => x.localeCompare(y, 'en', { numeric: true })))
    for (const a of assets) {
      expect(a.file).toMatch(/^models\/bp3d\/[a-z_.]+\.glb$/)
      const bytes = readFileSync(join(modelsDir, a.file.replace('models/bp3d/', '')))
      expect(a.bytes).toBe(bytes.length)
      expect(a.sha256).toBe(sha256(bytes))
      expect(a.coordinateFrame).toBe('anat-gltf-v1')
      expect(a.sourceId).toBe('src:bodyparts3d')
      expect(a.provenance.map((p) => p.step)).toEqual(expect.arrayContaining(['source', 'frame-conversion', 'weld', 'quantize-compress']))
      for (const n of a.nodes) {
        expect(n.structureId).toMatch(/^fma:\d+$/)
        expect(n.node).toMatch(/^FJ\d+$/)
        expect(n.triangles).toBeGreaterThan(0)
      }
    }
    expect(readdirSync(modelsDir)).not.toContain('stale.old.glb')
  })

  it('converts the frame: fixture vertex LPS (10, 20, 30) mm ends up at (0.010, 0.030, -0.020) m', async () => {
    expect(bp3dToApp([10, 20, 30])).toEqual([0.01, 0.03, -0.02])
    const sternumAsset = result.assets.find((a) => a.nodes.some((n) => n.node === 'FJ9005'))!
    const node = sternumAsset.nodes.find((n) => n.node === 'FJ9005')!
    // LPS bbox x 0..20, y 5..20, z 30..80 mm -> app x 0..0.02, y 0.03..0.08, z -0.02..-0.005 m
    expect(node.bbox).toEqual([0, 0.03, -0.02, 0.02, 0.08, -0.005])
    const doc = await readGlb(join(outDirs('a').modelsDir, sternumAsset.file.replace('models/bp3d/', '')))
    const gltfNode = doc.getRoot().listNodes().find((n) => n.getName() === 'FJ9005')!
    const verts = worldPositions(gltfNode)
    const nearest = Math.min(...verts.map((p) => Math.hypot(p[0] - 0.01, p[1] - 0.03, p[2] + 0.02)))
    expect(nearest).toBeLessThan(1e-4) // within quantization error (14-bit over a 5 cm mesh ≈ 3 µm)
  })

  it('verifies the converted axes: head above lower limb (+Y), sternum anterior to thoracic vertebra (+Z)', () => {
    expect(result.report.frameChecks.map((c) => [c.check, c.result])).toEqual([
      ['frame-axis-superior', 'pass'],
      ['frame-axis-anterior', 'pass'],
    ])
  })

  it('writes one mesh node per element, named by FJ id, with meshopt compression and quantization', async () => {
    for (const a of result.assets) {
      const doc = await readGlb(join(outDirs('a').modelsDir, a.file.replace('models/bp3d/', '')))
      const names = doc
        .getRoot()
        .listNodes()
        .filter((n) => n.getMesh())
        .map((n) => n.getName())
        .sort()
      expect(names).toEqual(a.nodes.map((n) => n.node).sort())
      const ext = doc
        .getRoot()
        .listExtensionsUsed()
        .map((e) => e.extensionName)
      expect(ext).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']))
      expect(doc.getRoot().getAsset().copyright).toContain('CC Attribution-Share Alike 2.1 Japan')
      const tri = doc
        .getRoot()
        .listMeshes()
        .reduce((s, m) => s + m.listPrimitives()[0]!.getIndices()!.getCount() / 3, 0)
      expect(tri).toBe(a.nodes.reduce((s, n) => s + n.triangles, 0))
    }
  })

  it('checks left/right against the centroid X sign and records mismatches without fixing them', () => {
    const inv = inventorySchema.parse(readJson<Inventory>(join(outDirs('a').inventoryDir, 'elements.json')))
    expect(inv.midline.method).toBe('left-right-pairs')
    expect(inv.midline.x).toBeCloseTo(0.005, 6)
    const el = (id: string) => inv.elements.find((e) => e.elementId === id)!
    const lat = (id: string) => el(id).checks.find((c) => c.check === 'laterality-centroid-sign')?.result
    expect(lat('FJ9001')).toBe('pass') // left humerus, +X
    expect(lat('FJ9002')).toBe('pass') // right humerus, -X
    expect(lat('FJ9011')).toBe('pass')
    expect(lat('FJ9012')).toBe('pass')
    expect(lat('FJ9008')).toBe('pass')
    expect(lat('FJ9003')).toBe('fail') // "left femur" deliberately placed at -X
    expect(el('FJ9001').geometry!.centroid[0]).toBeGreaterThan(inv.midline.x)
    expect(el('FJ9002').geometry!.centroid[0]).toBeLessThan(inv.midline.x)
    // Not "fixed": the mismatching element keeps its geometry and name.
    const femurNode = result.assets.flatMap((a) => a.nodes).find((n) => n.node === 'FJ9003')!
    expect(femurNode.centroid[0]).toBeCloseTo(-0.12, 6)
    expect(el('FJ9003').nameEn).toBe('left femur')
    expect(result.report.laterality.fail).toBe(1)
    expect(result.report.laterality.failures[0]!.elementId).toBe('FJ9003')
    // Unsided names get no laterality check at all (midline/unpaired is not guessed).
    expect(lat('FJ9005')).toBeUndefined()
  })

  it('classifies from the hierarchy when possible and flags keyword results as heuristic', () => {
    const inv = result.inventory
    const el = (id: string) => inv.elements.find((e) => e.elementId === id)!
    expect(el('FJ9001')).toMatchObject({ system: 'skeletal', classificationBasis: 'hierarchy', region: 'upper_limb', chunk: 'skeletal/upper_limb' })
    expect(el('FJ9003')).toMatchObject({ system: 'skeletal', classificationBasis: 'hierarchy' })
    expect(el('FJ9007')).toMatchObject({ system: 'sensory', classificationBasis: 'heuristic', region: 'head' })
    expect(el('FJ9013')).toMatchObject({ system: 'digestive', classificationBasis: 'heuristic', region: 'abdomen' })
    expect(el('FJ9001').partOfParents).toEqual(['fma:9900101'])
    expect(el('FJ9001').structureId).toBe('fma:9900001')
    // No FMA id: kept in the inventory, excluded from the GLBs.
    expect(el('FJ9010')).toMatchObject({ fmaId: null, structureId: null, chunk: null })
    expect(el('FJ9010').skipped).toMatch(/FMA/)
    expect(result.assets.flatMap((a) => a.nodes).some((n) => n.node === 'FJ9010')).toBe(false)
    expect(result.report.licenseStatements[0]!.text).toMatch(/Share Alike 2\.1 Japan/)
  })

  it('simplifies to the chunk budget, protects listed elements and writes a detail LOD', () => {
    const base = result.assets.find((a) => a.id === 'asset:bp3d.digestive.abdomen')!
    const detail = result.assets.find((a) => a.id === 'asset:bp3d.digestive.abdomen.detail')!
    expect(detail.lod).toBe('detail')
    expect(detail.detailFor).toBe(base.id)
    const b = (id: string) => base.nodes.find((n) => n.node === id)!
    const d = (id: string) => detail.nodes.find((n) => n.node === id)!
    // 40 × 80 UV sphere: 6400 triangles minus 160 degenerate pole triangles after welding.
    expect(d('FJ9013').triangles).toBe(6240)
    expect(b('FJ9013').triangles).toBeLessThan(1500)
    expect(b('FJ9014').triangles).toBe(d('FJ9014').triangles) // protected: untouched
    expect(b('FJ9014').protectedFromSimplification).toBe(true)
    expect(b('FJ9013').protectedFromSimplification).toBe(false)
    const chunk = result.report.chunks.find((c) => c.chunk === 'digestive/abdomen')!
    expect(chunk.budget).toBe(1500)
    expect(chunk.budgetMet).toBe(true)
    // Liver extent is preserved by the simplification.
    const extent = (n: ModelAsset['nodes'][number]) => n.bbox[3] - n.bbox[0]
    expect(extent(b('FJ9013'))).toBeGreaterThan(0.9 * extent(d('FJ9013')))
    // Default protected list: the incus is flagged even though it is tiny.
    const incus = result.assets.flatMap((a) => a.nodes).find((n) => n.node === 'FJ9007')!
    expect(incus.protectedFromSimplification).toBe(true)
    // Chunks that need no simplification get no redundant detail asset.
    expect(result.assets.some((a) => a.id === 'asset:bp3d.skeletal.upper_limb.detail')).toBe(false)
  })

  it('is deterministic: a second build produces byte-identical outputs', async () => {
    await run('b')
    const a = outDirs('a')
    const b = outDirs('b')
    for (const [da, db] of [
      [a.modelsDir, b.modelsDir],
      [a.dataDir, b.dataDir],
      [a.inventoryDir, b.inventoryDir],
    ] as const) {
      const files = readdirSync(da).sort()
      expect(readdirSync(db).sort()).toEqual(files)
      for (const f of files) expect(sha256(readFileSync(join(db, f))), f).toBe(sha256(readFileSync(join(da, f))))
    }
  }, 60_000)

  it('fails with a clear message when there is no input', async () => {
    await expect(
      buildModels({ inputDir: join(root, 'nope'), ...outDirs('c'), modelsUrlPrefix: 'models/bp3d/', date: DATE, config }),
    ).rejects.toThrow(/models:fetch/)
    expect(existsSync(outDirs('c').dataDir)).toBe(false)
  })
})

describe('source record and config', () => {
  it('BodyParts3D source record validates and states the share-alike license and attribution', () => {
    const s = sourceSchema.parse(BP3D_SOURCE)
    expect(s.license.shareAlike).toBe(true)
    expect(s.license.attribution).toBe(
      'BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan',
    )
    expect(s.license.notes).toMatch(/CC BY 4\.0/)
  })

  it('default config is valid and overrides deep-merge', () => {
    expect(resolveConfig()).toEqual(DEFAULT_CONFIG)
    const c = resolveConfig({ lod: { base: { chunkBudgets: { 'skeletal/thorax': 10 } } } })
    expect(c.lod.base.chunkBudgets['skeletal/thorax']).toBe(10)
    expect(c.lod.base.chunkBudgets['skeletal/head']).toBe(DEFAULT_CONFIG.lod.base.chunkBudgets['skeletal/head'])
    expect(c.lod.base.defaultTriangleBudget).toBe(DEFAULT_CONFIG.lod.base.defaultTriangleBudget)
  })
})
