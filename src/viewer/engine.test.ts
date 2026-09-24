/**
 * Engine integration tests without WebGL: the engine is never mounted, so these cover
 * loading (fetch → GLB parse → node lookup), store synchronisation, visibility styling,
 * selection/highlight, explode, clipping state and camera placement. Rendering, picking and
 * labels need a real WebGL context and are covered by browser e2e tests.
 *
 * Geometry comes from the SCHEMATIC (non-anatomical) fixture.
 */
import { WebIO } from '@gltf-transform/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { assetSchema, structureSchema, type ModelAsset, type StructureInput } from '../core/schema.ts'
import { createContentIndex } from '../data/contentIndex.ts'
import type { ContentBundle } from '../data/types.ts'
import { createSceneStore } from '../state/sceneStore.ts'
import { GHOST_OPACITY } from '../state/visibility.ts'
import { createViewerEngine, type ViewerEngineWithDebug } from './engine.ts'
import { SCHEMATIC_ASSET_ID, SCHEMATIC_SHAPES, buildSchematicDocument, makeSchematicAsset } from './fixtures/schematicModel.ts'
import { HIGHLIGHT_COLORS, SELECTION_COLOR } from './styles.ts'
import type { EngineEvent } from './types.ts'

const today = '2026-09-24'
const GROUP = 'ax:dev.schematic.group_x'
const PLUS_X = 'ax:dev.schematic.box_plus_x'
const MINUS_X = 'ax:dev.schematic.box_minus_x'
const CYL = 'ax:dev.schematic.cylinder_mid'
const PLUS_Z = 'ax:dev.schematic.box_plus_z'

const structure = (id: string, parentIds: string[] = []) =>
  structureSchema.parse({
    id,
    schemaVersion: 1,
    kind: 'other',
    names: { en: { value: `Schematic test shape ${id}`, status: 'unverified' } },
    systems: ['skeletal'],
    laterality: 'not_applicable',
    parentIds,
    detailLevel: 'basic',
    provenance: { createdBy: 'author:human', createdAt: today, updatedAt: today, notes: 'Test fixture, not anatomy' },
  } satisfies StructureInput)

let glb: Uint8Array<ArrayBuffer>
let asset: ModelAsset

function makeBundle(withAsset: boolean): ContentBundle {
  return {
    manifest: { schemaVersion: 1, contentVersion: 'test', generatedAt: today, counts: {}, files: {} },
    systems: [{ id: 'skeletal', name: { tr: 'Test sistemi', en: 'Test system' }, color: '#c0b090', layerOrder: 0 }],
    regions: [],
    structures: [
      structure(GROUP),
      ...SCHEMATIC_SHAPES.map((s) => structure(s.structureId, s.structureId === PLUS_X || s.structureId === MINUS_X ? [GROUP] : [])),
    ],
    relations: [],
    sources: [],
    assets: withAsset ? [asset] : [],
    lessons: [],
    questions: [],
    reviews: [],
    scope: [],
  }
}

function setup(opts: { withAsset?: boolean } = {}) {
  const index = createContentIndex(makeBundle(opts.withAsset ?? true))
  const store = createSceneStore()
  const events: EngineEvent[] = []
  const engine = createViewerEngine({
    index,
    store,
    assetUrl: (a) => `mem://${a.file}`,
    labelFor: (id) => index.displayName(id),
  })
  engine.on((e) => events.push(e))
  return { index, store, engine, events }
}

const nodeOf = (engine: ViewerEngineWithDebug, structureId: string) => {
  const n = engine.debugNodes().find((d) => d.structureId === structureId)
  if (!n) throw new Error(`no node for ${structureId}`)
  return n
}

const nodeRecord = (structureId: string) => asset.nodes.find((n) => n.structureId === structureId)!

beforeAll(async () => {
  const build = buildSchematicDocument()
  glb = await new WebIO().writeBinary(build.document)
  asset = assetSchema.parse(makeSchematicAsset({ nodes: build.nodes, bytes: glb.byteLength }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const serveGlb = () => vi.stubGlobal('fetch', vi.fn(async () => new Response(glb.slice())))

describe('viewer engine (headless)', () => {
  it('loads the asset, maps nodes to structures and syncs loadedAssets', async () => {
    serveGlb()
    const { engine, store, events } = setup()
    await engine.loadAsset(asset)
    expect(engine.isAssetLoaded(SCHEMATIC_ASSET_ID)).toBe(true)
    expect(store.getState().scene.loadedAssets).toEqual([SCHEMATIC_ASSET_ID])
    const nodes = engine.debugNodes()
    expect(nodes.map((n) => n.node).sort()).toEqual(SCHEMATIC_SHAPES.map((s) => s.node).sort())
    expect(nodes.every((n) => n.visible && n.selectable && n.opacity === 1)).toBe(true)
    expect(events.map((e) => e.type)).toContain('asset-loading')
    expect(events.at(-1)).toMatchObject({ type: 'asset-loaded', assetId: SCHEMATIC_ASSET_ID })
    engine.dispose()
  })

  it('is idempotent and de-duplicates concurrent loads', async () => {
    serveGlb()
    const { engine } = setup()
    const a = engine.loadAsset(asset)
    const b = engine.loadAsset(asset)
    expect(a).toBe(b)
    await a
    await engine.loadAsset(asset)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('frames all content from the anterior view after the first load', async () => {
    serveGlb()
    const { engine } = setup()
    await engine.loadAsset(asset)
    const cam = engine.getCameraState()
    // Union bbox of the fixture: x [-0.2, 0.2], y [0.75, 1.39], z [-0.05, 0.14]
    const xs = asset.nodes.flatMap((n) => [n.bbox[0], n.bbox[3]])
    const ys = asset.nodes.flatMap((n) => [n.bbox[1], n.bbox[4]])
    const zs = asset.nodes.flatMap((n) => [n.bbox[2], n.bbox[5]])
    const mid = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2
    expect(cam.target[0]).toBeCloseTo(mid(xs), 5)
    expect(cam.target[1]).toBeCloseTo(mid(ys), 5)
    expect(cam.target[2]).toBeCloseTo(mid(zs), 5)
    expect(cam.position[0]).toBeCloseTo(cam.target[0], 5)
    expect(cam.position[1]).toBeCloseTo(cam.target[1], 5)
    expect(cam.position[2]).toBeGreaterThan(cam.target[2]) // camera on the anterior (+Z) side
    engine.dispose()
  })

  it('renders resolved visibility: hidden, ghost, isolation, system switch', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    store.getState().setVisibility([PLUS_X], 'hidden')
    expect(nodeOf(engine, PLUS_X)).toMatchObject({ visible: false, selectable: false })
    store.getState().setVisibility([PLUS_X], 'ghost')
    expect(nodeOf(engine, PLUS_X)).toMatchObject({ visible: true, transparent: true, ghost: true, selectable: true })
    expect(nodeOf(engine, PLUS_X).opacity).toBeCloseTo(GHOST_OPACITY)
    store.getState().undo()
    store.getState().undo()
    expect(nodeOf(engine, PLUS_X)).toMatchObject({ visible: true, transparent: false })

    store.getState().isolate([GROUP])
    const visible = engine.debugNodes().filter((n) => n.visible).map((n) => n.structureId).sort()
    expect(visible).toEqual([MINUS_X, PLUS_X].sort())
    store.getState().clearIsolation()

    store.getState().setSystemVisible('skeletal', false)
    expect(engine.debugNodes().every((n) => !n.visible)).toBe(true)
    store.getState().setSystemVisible('skeletal', true)
    store.getState().dissect([GROUP])
    expect(nodeOf(engine, MINUS_X).visible).toBe(false)
    expect(nodeOf(engine, CYL).visible).toBe(true)
    engine.dispose()
  })

  it('shows selection of a parent on all descendant nodes, and temporary highlights', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    store.getState().select([GROUP])
    expect(nodeOf(engine, PLUS_X).emissive).toBe(SELECTION_COLOR)
    expect(nodeOf(engine, MINUS_X).emissive).toBe(SELECTION_COLOR)
    expect(nodeOf(engine, CYL).emissiveIntensity).toBe(0)

    engine.setHighlight([CYL], 'quiz_target')
    engine.setHighlight([PLUS_X], 'quiz_wrong')
    expect(nodeOf(engine, CYL).emissive).toBe(HIGHLIGHT_COLORS.quiz_target)
    expect(nodeOf(engine, PLUS_X).emissive).toBe(HIGHLIGHT_COLORS.quiz_wrong)
    engine.setHighlight([CYL], null)
    expect(nodeOf(engine, CYL).emissiveIntensity).toBe(0)
    engine.setHighlight([], null)
    expect(nodeOf(engine, PLUS_X).emissive).toBe(SELECTION_COLOR)
    // Temporary highlight never touches the scene store / undo history.
    expect(store.getState().past).toHaveLength(0)
    engine.dispose()
  })

  it('explodes nodes away from the content centre and returns to true positions', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    const xs = asset.nodes.flatMap((n) => [n.bbox[0], n.bbox[3]])
    const ys = asset.nodes.flatMap((n) => [n.bbox[1], n.bbox[4]])
    const zs = asset.nodes.flatMap((n) => [n.bbox[2], n.bbox[5]])
    const center = [xs, ys, zs].map((v) => (Math.min(...v) + Math.max(...v)) / 2)
    store.getState().setExplode(0.5)
    const c = nodeRecord(PLUS_X).centroid
    const off = nodeOf(engine, PLUS_X).offset
    for (let i = 0; i < 3; i++) expect(off[i]).toBeCloseTo((c[i]! - center[i]!) * 0.5, 6)
    expect(off[0]).toBeGreaterThan(0)
    expect(nodeOf(engine, MINUS_X).offset[0]).toBeLessThan(0)
    store.getState().setExplode(0)
    expect(engine.debugNodes().every((n) => n.offset.every((x) => x === 0))).toBe(true)
    engine.dispose()
  })

  it('applies the global clipping plane to every anatomy material', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    expect(engine.debugNodes().some((n) => n.clipped)).toBe(false)
    store.getState().setClip({ enabled: true, plane: 'sagittal', offset: 0, keep: 'positive' })
    expect(engine.debugNodes().every((n) => n.clipped)).toBe(true)
    store.getState().setClip({ enabled: false })
    expect(engine.debugNodes().some((n) => n.clipped)).toBe(false)
    engine.dispose()
  })

  it('places preset cameras on the correct anatomical side and focuses structures', async () => {
    serveGlb()
    const { engine } = setup()
    await engine.loadAsset(asset)
    engine.setCameraPreset('right', { animate: false })
    let cam = engine.getCameraState()
    expect(cam.position[0]).toBeLessThan(cam.target[0]) // subject's right = -X
    engine.setCameraPreset('superior', { animate: false })
    cam = engine.getCameraState()
    expect(cam.position[1]).toBeGreaterThan(cam.target[1])

    engine.focusStructures([PLUS_Z], { animate: false })
    cam = engine.getCameraState()
    const c = nodeRecord(PLUS_Z).centroid
    for (let i = 0; i < 3; i++) expect(cam.target[i]).toBeCloseTo(c[i]!, 5)

    const saved = { position: [0.3, 1.2, 1.5] as [number, number, number], target: [0, 1, 0] as [number, number, number], up: [0, 1, 0] as [number, number, number] }
    engine.setCameraState(saved, { animate: false })
    cam = engine.getCameraState()
    for (let i = 0; i < 3; i++) {
      expect(cam.position[i]).toBeCloseTo(saved.position[i]!, 6)
      expect(cam.target[i]).toBeCloseTo(saved.target[i]!, 6)
    }
    engine.dispose()
  })

  it('applies a camera stored in the scene (saved view)', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    const scene = { ...store.getState().scene, camera: { position: [1, 1, 1] as [number, number, number], target: [0, 1, 0] as [number, number, number], up: [0, 1, 0] as [number, number, number] } }
    store.getState().loadScene(scene)
    expect(engine.getCameraState().position[0]).toBeCloseTo(1, 6)
    engine.dispose()
  })

  it('unloads assets and frees their nodes', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    engine.unloadAsset(SCHEMATIC_ASSET_ID)
    expect(engine.isAssetLoaded(SCHEMATIC_ASSET_ID)).toBe(false)
    expect(store.getState().scene.loadedAssets).toEqual([])
    expect(engine.debugNodes()).toEqual([])
    engine.dispose()
  })

  it('aborts a pending load when the asset is unloaded', async () => {
    let release!: () => void
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await new Promise<void>((r) => (release = r))
        return new Response(glb.slice())
      }),
    )
    const { engine, store } = setup()
    const p = engine.loadAsset(asset)
    engine.unloadAsset(SCHEMATIC_ASSET_ID)
    release()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(engine.isAssetLoaded(SCHEMATIC_ASSET_ID)).toBe(false)
    expect(store.getState().scene.loadedAssets).toEqual([])
    engine.dispose()
  })

  it('reports load errors with a retry hint', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    const { engine, events } = setup()
    await expect(engine.loadAsset(asset)).rejects.toMatchObject({ retryable: true })
    expect(events.at(-1)).toMatchObject({ type: 'asset-error', assetId: SCHEMATIC_ASSET_ID, retryable: true })
    expect(engine.isAssetLoaded(SCHEMATIC_ASSET_ID)).toBe(false)

    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]))))
    await expect(engine.loadAsset(asset)).rejects.toMatchObject({ retryable: false })
    expect(events.at(-1)).toMatchObject({ type: 'asset-error', retryable: false })
    engine.dispose()
  })

  it('rejects a file whose hash does not match the catalogue', async () => {
    serveGlb()
    const { engine, events } = setup()
    await expect(engine.loadAsset({ ...asset, sha256: '0'.repeat(64) })).rejects.toBeTruthy()
    expect(events.at(-1)).toMatchObject({ type: 'asset-error' })
    engine.dispose()
  })

  it('renders assets that are not in the content bundle (dev fixtures)', async () => {
    serveGlb()
    const { engine } = setup({ withAsset: false })
    await engine.loadAsset(asset)
    expect(engine.debugNodes().every((n) => n.visible)).toBe(true)
    engine.dispose()
  })

  it('removes its assets from the store when disposed', async () => {
    serveGlb()
    const { engine, store } = setup()
    await engine.loadAsset(asset)
    store.getState().setLoadedAssets([...store.getState().scene.loadedAssets, 'asset:other'])
    engine.dispose()
    expect(store.getState().scene.loadedAssets).toEqual(['asset:other'])
  })

  it('refuses work after dispose', async () => {
    const { engine } = setup()
    engine.dispose()
    await expect(engine.loadAsset(asset)).rejects.toThrow()
    expect(engine.getStats().loadedAssets).toBe(0)
  })
})
