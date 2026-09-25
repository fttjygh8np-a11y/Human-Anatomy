import type { SceneState, SystemId } from '../core/schema.ts'

/** Systems whose models are loaded on first start (the rest load when switched on). */
export const DEFAULT_ON_SYSTEMS: ReadonlySet<SystemId> = new Set<SystemId>(['skeletal'])

/** Whether a system is switched on (its base models loaded and shown). */
export function isSystemOn(scene: SceneState, id: SystemId): boolean {
  return scene.systemVisibility[id] ?? DEFAULT_ON_SYSTEMS.has(id)
}
