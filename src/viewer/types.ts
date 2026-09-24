/**
 * 3D engine contract. The engine is imperative Three.js code (src/viewer/engine.ts),
 * wrapped for React by src/ui/viewer/ViewerCanvas.tsx.
 *
 * The engine subscribes to the scene store (src/state/sceneStore.ts) and renders the
 * effective visibility computed by src/state/visibility.ts. The UI never manipulates
 * Three.js objects directly.
 */
import type { CameraPreset, CameraState, ModelAsset, SceneState, StructureId } from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import type { SceneStoreApi } from '../state/sceneStore.ts'

export type QualityLevel = 'low' | 'medium' | 'high'

export type HighlightStyle = 'relation' | 'quiz_target' | 'quiz_correct' | 'quiz_wrong' | 'lesson'

/** Which anatomical direction is currently toward screen right / screen up (for L/R markers). */
export interface ScreenOrientation {
  screenRight: 'left' | 'right' | 'anterior' | 'posterior' | 'superior' | 'inferior'
  screenUp: 'left' | 'right' | 'anterior' | 'posterior' | 'superior' | 'inferior'
  /** Camera view direction expressed as the nearest standard preset. */
  nearestPreset: CameraPreset
}

export interface EngineStats {
  fps: number
  frameMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  loadedAssets: number
  /** performance.memory.usedJSHeapSize when available (Chromium), else null. */
  jsHeapBytes: number | null
}

export interface LoadProgress {
  assetId: string
  loaded: number
  total: number | null
}

export type EngineEvent =
  | { type: 'pick'; structureId: StructureId | null; additive: boolean; point: [number, number, number] | null }
  | { type: 'hover'; structureId: StructureId | null }
  | { type: 'asset-loading'; progress: LoadProgress }
  | { type: 'asset-loaded'; assetId: string; ms: number }
  | { type: 'asset-error'; assetId: string; error: string; retryable: boolean }
  | { type: 'context-lost' }
  | { type: 'context-restored' }
  | { type: 'unsupported'; reason: string }
  | { type: 'orientation'; orientation: ScreenOrientation }
  | { type: 'first-frame'; ms: number }

export interface LabelOptions {
  enabled: boolean
  density: SceneState['labels']['density']
  /** Exam mode: never render names that could reveal answers. */
  suppressNames: boolean
}

export interface ViewerEngine {
  /** Attach to a container element (engine creates canvas + label overlay). */
  mount(container: HTMLElement): void
  dispose(): void

  /** Load an asset GLB (idempotent). Resolves when meshes are in the scene. */
  loadAsset(asset: ModelAsset): Promise<void>
  unloadAsset(assetId: string): void
  isAssetLoaded(assetId: string): boolean

  setCameraPreset(preset: CameraPreset, opts?: { animate?: boolean }): void
  /** Initial camera: anterior view framing all loaded content. */
  resetCamera(opts?: { animate?: boolean }): void
  focusStructures(ids: StructureId[], opts?: { animate?: boolean }): void
  getCameraState(): CameraState
  setCameraState(state: CameraState, opts?: { animate?: boolean }): void

  /** Temporary emphasis (does not change scene state / undo history). */
  setHighlight(ids: StructureId[], style: HighlightStyle | null): void
  setLabelOptions(opts: LabelOptions): void
  setQuality(level: QualityLevel): void
  setReducedMotion(reduced: boolean): void

  getStats(): EngineStats
  on(listener: (e: EngineEvent) => void): () => void

  /** Structure under a canvas pixel (for keyboard/touch alternatives and tests). */
  pickAt(clientX: number, clientY: number): StructureId | null
  /** Project a structure's anchor to canvas pixels (null if off-screen/hidden). */
  projectStructure(id: StructureId): { x: number; y: number } | null

  /**
   * Performance measurement: orbit the camera 360° around the current target for
   * `durationMs`, rendering every animation frame, and report real frame statistics.
   */
  runOrbitBenchmark(durationMs: number): Promise<BenchmarkResult>
}

export interface BenchmarkResult {
  durationMs: number
  frames: number
  fps: number
  frameMsP50: number
  frameMsP95: number
  frameMsMax: number
  drawCalls: number
  triangles: number
  jsHeapBytes: number | null
}

export interface EngineDeps {
  index: ContentIndex
  store: SceneStoreApi
  /** Resolves asset file paths to URLs (handles app base path). */
  assetUrl(asset: ModelAsset): string
  /** Name used for labels (already localized). */
  labelFor(id: StructureId): string
}
