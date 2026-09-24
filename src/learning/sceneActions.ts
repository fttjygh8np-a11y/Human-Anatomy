/**
 * Declarative scene actions (see SceneAction in ./types.ts).
 *
 * Planners in this folder are pure: they simulate the store-level effect of the actions they
 * emit (mirroring the scene store's semantics) and verify the result with resolveVisibility.
 * `applySceneActions` then commits the simulated scene in one undoable step via
 * `loadScene`, and routes engine-level actions to the provided effect handlers.
 */
import type { CameraPreset, SceneState, StructureId } from '../core/schema.ts'
import type { SceneStoreApi } from '../state/sceneStore.ts'
import type { SceneAction } from './types.ts'

export type EngineAction = Extract<SceneAction, { type: 'loadAssets' | 'highlight' | 'focus' | 'cameraPreset' }>

const ENGINE_ACTIONS: ReadonlySet<SceneAction['type']> = new Set(['loadAssets', 'highlight', 'focus', 'cameraPreset'])

export function isEngineAction(a: SceneAction): a is EngineAction {
  return ENGINE_ACTIONS.has(a.type)
}

const unique = <T>(xs: readonly T[]) => [...new Set(xs)]

/**
 * Store-level effect of one action on a scene (pure; returns a new object).
 * `loadAssets` is simulated as a successful load so later planning steps can assume it.
 */
export function simulateSceneAction(scene: SceneState, a: SceneAction): SceneState {
  switch (a.type) {
    case 'loadAssets':
      return { ...scene, loadedAssets: unique([...scene.loadedAssets, ...a.assetIds]) }
    case 'restoreDissected':
      return { ...scene, dissected: scene.dissected.filter((x) => !a.ids.includes(x)) }
    case 'clearIsolation':
      return { ...scene, isolated: [] }
    case 'isolate':
      return a.ids.length === 0 ? scene : { ...scene, isolated: unique(a.ids) }
    case 'setVisibility': {
      const visibility = { ...scene.visibility }
      for (const id of a.ids) visibility[id] = a.mode
      return { ...scene, visibility }
    }
    case 'setSystemVisible':
      return { ...scene, systemVisibility: { ...scene.systemVisibility, [a.system]: a.visible } }
    case 'setSystemOpacity':
      return { ...scene, systemOpacity: { ...scene.systemOpacity, [a.system]: Math.min(1, Math.max(0, a.opacity)) } }
    case 'clearSelection':
      return scene.selected.length === 0 ? scene : { ...scene, selected: [] }
    case 'select':
      return { ...scene, selected: unique(a.ids) }
    case 'highlight':
    case 'focus':
    case 'cameraPreset':
      return scene
  }
}

export function simulateSceneActions(scene: SceneState, actions: readonly SceneAction[]): SceneState {
  return actions.reduce(simulateSceneAction, scene)
}

/** Handlers for engine-level actions (typically bound to the ViewerEngine). */
export interface SceneEffects {
  loadAssets?(assetIds: string[]): void | Promise<void>
  highlight?(ids: StructureId[], style: Extract<SceneAction, { type: 'highlight' }>['style']): void
  focus?(ids: StructureId[]): void
  cameraPreset?(preset: CameraPreset): void
}

export interface ApplyResult {
  /** Store-level changes were committed (as a single undo step). */
  storeChanged: boolean
  /** Engine-level actions without a handler (the caller must perform them). */
  deferred: EngineAction[]
  /** Resolves when all asset loads started by the effects have finished. */
  done: Promise<void>
}

/**
 * Apply actions: all store-level changes at once (one undo step labelled `label`), then the
 * engine-level actions in order through `effects`.
 */
export function applySceneActions(
  store: SceneStoreApi,
  actions: readonly SceneAction[],
  effects: SceneEffects = {},
  label = 'Görünüm hazırlandı',
): ApplyResult {
  const current = store.getState().scene
  const storeActions = actions.filter((a) => !isEngineAction(a))
  let storeChanged = false
  if (storeActions.length > 0) {
    // loadedAssets is owned by the engine (set after real loads); never pre-mark assets as loaded.
    const next = { ...simulateSceneActions(current, storeActions), loadedAssets: current.loadedAssets }
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      const onlySelection = JSON.stringify({ ...next, selected: [] }) === JSON.stringify({ ...current, selected: [] })
      if (onlySelection) {
        if (next.selected.length === 0) store.getState().clearSelection()
        else store.getState().select(next.selected)
      } else {
        store.getState().loadScene(next, label)
      }
      storeChanged = true
    }
  }

  const deferred: EngineAction[] = []
  const pending: Promise<void>[] = []
  for (const a of actions) {
    if (!isEngineAction(a)) continue
    switch (a.type) {
      case 'loadAssets':
        if (effects.loadAssets) pending.push(Promise.resolve(effects.loadAssets(a.assetIds)))
        else deferred.push(a)
        break
      case 'highlight':
        if (effects.highlight) effects.highlight(a.ids, a.style)
        else deferred.push(a)
        break
      case 'focus':
        if (effects.focus) effects.focus(a.ids)
        else deferred.push(a)
        break
      case 'cameraPreset':
        if (effects.cameraPreset) effects.cameraPreset(a.preset)
        else deferred.push(a)
        break
    }
  }
  return { storeChanged, deferred, done: Promise.all(pending).then(() => undefined) }
}
