/**
 * Measurement/test hook for `npm run perf` and the Playwright tests. Exposes the 3D engine and
 * the scene store as `window.__anatomi` ONLY in development builds or when the page URL has a
 * `perf` query parameter (`/?perf`). Production pages without the flag expose nothing.
 */
import type { SceneStoreApi } from '../state/sceneStore.ts'
import type { ViewerEngine } from '../viewer/types.ts'

export interface AnatomiTestHook {
  engine: ViewerEngine | null
  store: SceneStoreApi
  /** `performance.now()` (ms since navigation start) of the first frame showing models; null until then. */
  firstFrameMs: number | null
  /** Load durations reported by the engine ('asset-loaded' events). */
  assetLoads: { assetId: string; ms: number }[]
}

declare global {
  interface Window {
    __anatomi?: AnatomiTestHook
  }
}

const enabled =
  import.meta.env.DEV || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf'))

let unsubscribe: (() => void) | null = null

/** Called with the engine after the viewer mounts (and with null before it is disposed). */
export function exposeEngine(engine: ViewerEngine | null, store: SceneStoreApi): void {
  if (!enabled) return
  unsubscribe?.()
  unsubscribe = null
  const hook = (window.__anatomi ??= { engine: null, store, firstFrameMs: null, assetLoads: [] })
  hook.engine = engine
  if (!engine) return
  unsubscribe = engine.on((e) => {
    if (e.type === 'first-frame') hook.firstFrameMs ??= e.ms
    else if (e.type === 'asset-loaded') hook.assetLoads.push({ assetId: e.assetId, ms: e.ms })
  })
}
