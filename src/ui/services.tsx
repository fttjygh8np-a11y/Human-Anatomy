/**
 * App-wide services for React components: content index, scene store, and the optional
 * search/user/engine services (null until ready or unavailable).
 */
import { createContext, useContext } from 'react'
import type { ContentIndex } from '../data/types.ts'
import type { SearchService } from '../search/types.ts'
import type { SceneStore, SceneStoreApi } from '../state/sceneStore.ts'
import { useSceneStore } from '../state/hooks.ts'
import type { UserDataStore, UserSettings } from '../user/types.ts'
import type { ViewerEngine } from '../viewer/types.ts'

export interface Services {
  index: ContentIndex
  store: SceneStoreApi
  search: SearchService | null
  user: UserDataStore | null
  engine: ViewerEngine | null
  settings: UserSettings
  updateSettings(patch: Partial<UserSettings>): void
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const s = useContext(ServicesContext)
  if (!s) throw new Error('ServicesContext missing')
  return s
}

/** Scene store selector bound to the store in context. */
export function useScene<T>(selector: (s: SceneStore) => T): T {
  return useSceneStore(selector, useServices().store)
}
