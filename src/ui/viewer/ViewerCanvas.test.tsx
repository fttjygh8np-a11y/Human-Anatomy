// @vitest-environment jsdom
/**
 * jsdom has no WebGL: the real engine takes its "unsupported" path; wrapper behaviour
 * (events → store / announcements / markers / retry) is tested with a fake engine.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assetSchema, structureSchema } from '../../core/schema.ts'
import { createContentIndex } from '../../data/contentIndex.ts'
import type { ContentBundle } from '../../data/types.ts'
import { createSceneStore } from '../../state/sceneStore.ts'
import type { EngineEvent, LabelOptions, ViewerEngine } from '../../viewer/types.ts'
import { ViewerCanvas } from './ViewerCanvas.tsx'

const today = '2026-09-24'
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
  label: { tr: 'Test modeli', en: 'Test model' },
  nodes: [{ node: 'n1', structureId: 'ax:test.one', triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [0.5, 0.5, 0.5] }],
  provenance: [{ date: today, step: 'test', tool: 'vitest' }],
})

const bundle: ContentBundle = {
  manifest: { schemaVersion: 1, contentVersion: 't', generatedAt: today, counts: {}, files: {} },
  systems: [],
  regions: [],
  structures: [
    structureSchema.parse({
      id: 'ax:test.one',
      schemaVersion: 1,
      kind: 'other',
      names: { en: { value: 'Test shape', status: 'unverified' }, tr: { value: 'Test şekli', status: 'unverified' } },
      systems: ['skeletal'],
      laterality: 'not_applicable',
      detailLevel: 'basic',
      provenance: { createdBy: 'author:human', createdAt: today, updatedAt: today },
    }),
  ],
  relations: [],
  sources: [],
  assets: [asset],
  lessons: [],
  questions: [],
  reviews: [],
  scope: [],
}

function fakeEngine() {
  const listeners = new Set<(e: EngineEvent) => void>()
  const engine = {
    mount: vi.fn(),
    dispose: vi.fn(),
    loadAsset: vi.fn(async () => {}),
    unloadAsset: vi.fn(),
    isAssetLoaded: vi.fn(() => false),
    setCameraPreset: vi.fn(),
    resetCamera: vi.fn(),
    focusStructures: vi.fn(),
    getCameraState: vi.fn(() => ({ position: [0, 0, 1] as [number, number, number], target: [0, 0, 0] as [number, number, number], up: [0, 1, 0] as [number, number, number] })),
    setCameraState: vi.fn(),
    setHighlight: vi.fn(),
    setLabelOptions: vi.fn<(o: LabelOptions) => void>(),
    setQuality: vi.fn(),
    setReducedMotion: vi.fn(),
    getStats: vi.fn(),
    on: (l: (e: EngineEvent) => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    pickAt: vi.fn(() => null),
    projectStructure: vi.fn(() => null),
    runOrbitBenchmark: vi.fn(),
  } satisfies Record<keyof ViewerEngine, unknown>
  const emit = (e: EngineEvent) => act(() => listeners.forEach((l) => l(e)))
  return { engine: engine as unknown as ViewerEngine, mocks: engine, emit }
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const index = createContentIndex(bundle)

describe('ViewerCanvas with the real engine (no WebGL in jsdom)', () => {
  it('renders an accessible application region with keyboard help and a live region', () => {
    render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} />)
    const region = screen.getByRole('application', { name: '3B anatomi modeli' })
    expect(region.getAttribute('tabindex')).toBe('0')
    const help = document.getElementById(region.getAttribute('aria-describedby')!)
    expect(help?.textContent).toMatch(/ok tuşları/)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('shows a Turkish fallback pointing to the text-based alternative when WebGL 2 is unavailable', () => {
    const onEvent = vi.fn()
    render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} onEvent={onEvent} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/WebGL 2/)
    expect(alert.textContent).toMatch(/bilgi kartları/)
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'unsupported' }))
  })

  it('hands the engine to the parent and releases it on unmount', () => {
    const onEngine = vi.fn<(e: ViewerEngine | null) => void>()
    const { unmount } = render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} onEngine={onEngine} />)
    expect(onEngine.mock.calls[0]?.[0]).toBeTruthy()
    unmount()
    expect(onEngine.mock.calls.at(-1)?.[0]).toBeNull()
  })
})

describe('ViewerCanvas behaviour (fake engine)', () => {
  it('mounts, forwards label options and disposes', () => {
    const f = fakeEngine()
    const { unmount, rerender } = render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} engineFactory={() => f.engine} />)
    expect(f.mocks.mount).toHaveBeenCalledTimes(1)
    expect(f.mocks.setLabelOptions).toHaveBeenLastCalledWith({ enabled: true, density: 'medium', suppressNames: false })
    rerender(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} engineFactory={() => f.engine} suppressNames />)
    expect(f.mocks.setLabelOptions).toHaveBeenLastCalledWith(expect.objectContaining({ suppressNames: true }))
    unmount()
    expect(f.mocks.dispose).toHaveBeenCalled()
  })

  it('shows subject-side orientation markers (anterior view: subject right on screen left)', () => {
    const f = fakeEngine()
    render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} engineFactory={() => f.engine} />)
    f.emit({ type: 'orientation', orientation: { screenRight: 'left', screenUp: 'superior', nearestPreset: 'anterior' } })
    const markers = document.querySelector('[data-viewer-orientation]')!
    const spans = [...markers.querySelectorAll('span')]
    const byEdge = (edge: 'right' | 'left' | 'top' | 'bottom') => spans.find((s) => s.style[edge] === '6px')?.textContent
    expect(byEdge('right')).toBe('Sol')
    expect(byEdge('left')).toBe('Sağ')
    expect(byEdge('top')).toBe('Üst')
    expect(byEdge('bottom')).toBe('Alt')
  })

  it('selects picked structures and announces them, without names in exam mode', () => {
    const f = fakeEngine()
    const store = createSceneStore()
    const { rerender } = render(<ViewerCanvas index={index} store={store} assetUrl={(a) => a.file} engineFactory={() => f.engine} />)
    f.emit({ type: 'pick', structureId: 'ax:test.one', additive: false, point: [0, 0, 0] })
    expect(store.getState().scene.selected).toEqual(['ax:test.one'])
    expect(screen.getByRole('status').textContent).toBe('Seçildi: Test şekli')

    rerender(<ViewerCanvas index={index} store={store} assetUrl={(a) => a.file} engineFactory={() => f.engine} suppressNames />)
    f.emit({ type: 'pick', structureId: 'ax:test.one', additive: false, point: [0, 0, 0] })
    expect(screen.getByRole('status').textContent).toBe('Bir yapı seçildi.')

    f.emit({ type: 'pick', structureId: null, additive: false, point: null })
    expect(store.getState().scene.selected).toEqual([])
  })

  it('leaves selection to the parent when selectOnPick is false', () => {
    const f = fakeEngine()
    const store = createSceneStore()
    const onPick = vi.fn()
    render(<ViewerCanvas index={index} store={store} assetUrl={(a) => a.file} engineFactory={() => f.engine} selectOnPick={false} onPick={onPick} />)
    f.emit({ type: 'pick', structureId: 'ax:test.one', additive: true, point: null })
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ structureId: 'ax:test.one', additive: true }))
    expect(store.getState().scene.selected).toEqual([])
  })

  it('declares modified pictures: schematic model, exploded view and surface clipping', () => {
    const f = fakeEngine()
    const store = createSceneStore()
    store.getState().setLoadedAssets(['asset:test'])
    store.getState().setExplode(0.4)
    store.getState().setClip({ enabled: true })
    render(<ViewerCanvas index={index} store={store} assetUrl={(a) => a.file} engineFactory={() => f.engine} />)
    const note = screen.getByRole('note')
    expect(note.textContent).toMatch(/Şematik model/)
    expect(note.textContent).toMatch(/gerçek konumlarında/)
    expect(note.textContent).toMatch(/BT veya MR görüntüsü değildir/)
    act(() => store.getState().setExplode(0))
    expect(screen.getByRole('note').textContent).not.toMatch(/gerçek konumlarında/)
  })

  it('loads declared assets and offers a retry for transient load errors', () => {
    const f = fakeEngine()
    render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} engineFactory={() => f.engine} assets={[asset]} />)
    expect(f.mocks.loadAsset).toHaveBeenCalledWith(asset)
    f.emit({ type: 'asset-error', assetId: 'asset:test', error: 'Model dosyası indirilemedi (HTTP 503).', retryable: true })
    expect(screen.getByRole('alert').textContent).toMatch(/HTTP 503/)
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(f.mocks.loadAsset).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports graphics context loss and recovery', () => {
    const f = fakeEngine()
    render(<ViewerCanvas index={index} store={createSceneStore()} assetUrl={(a) => a.file} engineFactory={() => f.engine} />)
    f.emit({ type: 'context-lost' })
    expect(screen.getByRole('alert').textContent).toMatch(/Grafik bağlamı kaybedildi/)
    f.emit({ type: 'context-restored' })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Grafik bağlamı geri yüklendi.')
  })
})
