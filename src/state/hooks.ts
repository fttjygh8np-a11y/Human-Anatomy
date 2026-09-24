/** React bindings for the vanilla scene store. */
import { useStore } from 'zustand'
import { sceneStore, type SceneStore, type SceneStoreApi } from './sceneStore.ts'

export function useSceneStore<T>(selector: (s: SceneStore) => T, store: SceneStoreApi = sceneStore): T {
  return useStore(store, selector)
}
