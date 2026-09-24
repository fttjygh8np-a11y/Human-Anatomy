/**
 * Scene state store with undo/redo.
 *
 * Framework-agnostic (zustand vanilla) so the imperative 3D engine can subscribe
 * without React; React components use `useSceneStore` from ./hooks.ts.
 *
 * Undoable: visibility, system visibility/opacity, isolation, dissection, clipping,
 * explode factor and label settings. Not undoable: selection and camera (camera moves
 * would flood the history; saved views capture the camera explicitly).
 */
import { createStore } from 'zustand/vanilla'
import {
  sceneStateSchema,
  type ClipState,
  type SceneState,
  type StructureId,
  type SystemId,
  type VisibilityMode,
} from '../core/schema.ts'

export const HISTORY_LIMIT = 200

export function initialSceneState(): SceneState {
  return sceneStateSchema.parse({})
}

/** Undoable part of the scene. */
type Snapshot = Omit<SceneState, 'selected' | 'camera' | 'loadedAssets'>

function snapshotOf(s: SceneState): Snapshot {
  const { selected: _s, camera: _c, loadedAssets: _l, ...rest } = s
  return structuredClone(rest)
}

export interface HistoryEntry {
  label: string
  before: Snapshot
}

export interface SceneStore {
  scene: SceneState
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** Human-readable label of the last change (for "Geri al: …" tooltips / live region). */
  lastAction: string | null

  setVisibility(ids: StructureId[], mode: VisibilityMode): void
  showOnly(ids: StructureId[]): void
  setSystemVisible(system: SystemId, visible: boolean): void
  setSystemOpacity(system: SystemId, opacity: number): void
  isolate(ids: StructureId[]): void
  clearIsolation(): void
  /** Virtual dissection: remove structures (in order) — each call is one undo step. */
  dissect(ids: StructureId[]): void
  restoreDissected(ids?: StructureId[]): void
  setClip(patch: Partial<ClipState>): void
  setExplode(factor: number): void
  setLabels(patch: Partial<SceneState['labels']>): void
  /** Make a (possibly hidden/dissected/isolated-away) structure visible again — used by search. */
  reveal(ids: StructureId[]): void
  resetScene(): void

  select(ids: StructureId[], opts?: { additive?: boolean }): void
  clearSelection(): void
  setLoadedAssets(ids: string[]): void

  /** Replace the whole scene (saved view / error report reproduction). Undoable. */
  loadScene(scene: SceneState, label?: string): void

  undo(): void
  redo(): void
}

export function createSceneStore(initial: SceneState = initialSceneState()) {
  return createStore<SceneStore>()((set, get) => {
    /** Apply an undoable mutation. */
    const commit = (label: string, mutate: (draft: SceneState) => void) => {
      const cur = get().scene
      const before = snapshotOf(cur)
      const next = structuredClone(cur)
      mutate(next)
      if (JSON.stringify(snapshotOf(next)) === JSON.stringify(before)) {
        // no-op change: keep history clean
        set({ scene: next })
        return
      }
      const past = [...get().past, { label, before }].slice(-HISTORY_LIMIT)
      set({ scene: next, past, future: [], lastAction: label })
    }

    return {
      scene: initial,
      past: [],
      future: [],
      lastAction: null,

      setVisibility(ids, mode) {
        if (ids.length === 0) return
        const label = mode === 'hidden' ? 'Gizle' : mode === 'ghost' ? 'Saydamlaştır' : 'Göster'
        commit(label, (d) => {
          // Explicit entries: 'visible' forces visibility even when the structure's system is off.
          for (const id of ids) d.visibility[id] = mode
        })
      },

      showOnly(ids) {
        commit('Yalnızca bunları göster', (d) => {
          d.isolated = [...new Set(ids)]
        })
      },

      setSystemVisible(system, visible) {
        commit(visible ? 'Sistemi göster' : 'Sistemi gizle', (d) => {
          d.systemVisibility[system] = visible
        })
      },

      setSystemOpacity(system, opacity) {
        const v = Math.min(1, Math.max(0, opacity))
        commit('Sistem saydamlığı', (d) => {
          d.systemOpacity[system] = v
        })
      },

      isolate(ids) {
        if (ids.length === 0) return
        commit('İzole et', (d) => {
          d.isolated = [...new Set(ids)]
        })
      },

      clearIsolation() {
        commit('İzolasyonu kaldır', (d) => {
          d.isolated = []
        })
      },

      dissect(ids) {
        if (ids.length === 0) return
        commit('Diseksiyon: kaldır', (d) => {
          for (const id of ids) if (!d.dissected.includes(id)) d.dissected.push(id)
          d.selected = d.selected.filter((s) => !ids.includes(s))
        })
      },

      restoreDissected(ids) {
        commit('Diseksiyon: geri koy', (d) => {
          d.dissected = ids ? d.dissected.filter((x) => !ids.includes(x)) : []
        })
      },

      setClip(patch) {
        commit('Kesit', (d) => {
          d.clip = { ...d.clip, ...patch }
        })
      },

      setExplode(factor) {
        const v = Math.min(1, Math.max(0, factor))
        commit(v === 0 ? 'Gerçek konumlara dön' : 'Ayrıştırılmış görünüm', (d) => {
          d.explode = v
        })
      },

      setLabels(patch) {
        commit('Etiket ayarı', (d) => {
          d.labels = { ...d.labels, ...patch }
        })
      },

      reveal(ids) {
        commit('Yapıyı görünür yap', (d) => {
          for (const id of ids) d.visibility[id] = 'visible'
          d.dissected = d.dissected.filter((x) => !ids.includes(x))
          if (d.isolated.length > 0) d.isolated = [...new Set([...d.isolated, ...ids])]
        })
      },

      resetScene() {
        commit('Başlangıç görünümü', (d) => {
          const fresh = initialSceneState()
          d.visibility = fresh.visibility
          d.systemVisibility = fresh.systemVisibility
          d.systemOpacity = fresh.systemOpacity
          d.isolated = fresh.isolated
          d.dissected = fresh.dissected
          d.clip = fresh.clip
          d.explode = fresh.explode
          d.labels = fresh.labels
        })
      },

      select(ids, opts) {
        const cur = get().scene
        const selected = opts?.additive ? [...new Set([...cur.selected, ...ids])] : [...new Set(ids)]
        set({ scene: { ...cur, selected } })
      },

      clearSelection() {
        set({ scene: { ...get().scene, selected: [] } })
      },

      setLoadedAssets(ids) {
        set({ scene: { ...get().scene, loadedAssets: [...ids] } })
      },

      loadScene(scene, label = 'Kayıtlı görünümü aç') {
        const parsed = sceneStateSchema.parse(scene)
        commit(label, (d) => {
          Object.assign(d, snapshotOf(parsed))
          d.selected = parsed.selected
          if (parsed.camera) d.camera = parsed.camera
        })
      },

      undo() {
        const { past, future, scene } = get()
        const entry = past[past.length - 1]
        if (!entry) return
        const redoEntry: HistoryEntry = { label: entry.label, before: snapshotOf(scene) }
        set({
          scene: { ...scene, ...structuredClone(entry.before) },
          past: past.slice(0, -1),
          future: [...future, redoEntry],
          lastAction: `Geri alındı: ${entry.label}`,
        })
      },

      redo() {
        const { past, future, scene } = get()
        const entry = future[future.length - 1]
        if (!entry) return
        const undoEntry: HistoryEntry = { label: entry.label, before: snapshotOf(scene) }
        set({
          scene: { ...scene, ...structuredClone(entry.before) },
          future: future.slice(0, -1),
          past: [...past, undoEntry],
          lastAction: `Yeniden uygulandı: ${entry.label}`,
        })
      },
    }
  })
}

export type SceneStoreApi = ReturnType<typeof createSceneStore>

/** App-wide singleton. Tests create their own via createSceneStore(). */
export const sceneStore = createSceneStore()
