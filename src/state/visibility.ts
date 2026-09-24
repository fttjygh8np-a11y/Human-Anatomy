/**
 * Effective visibility resolution — shared by the 3D engine (rendering), the structure
 * trees (state badges), search ("reveal" action) and the quiz engine (answerability).
 *
 * Precedence (first match wins):
 *  1. asset not loaded / no model                      -> absent
 *  2. self or ancestor dissected                       -> hidden  (reason: dissected)
 *  3. isolation active and self/ancestor not isolated  -> hidden  (reason: isolation)
 *  4. most specific explicit override (self, then nearest ancestor):
 *       hidden -> hidden (manual) · ghost -> ghost · visible -> visible (forced; ignores system switch)
 *  5. primary system switched off                      -> hidden  (reason: system)
 *  6. visible with the system opacity
 */
import type { SceneState, StructureId, SystemId, VisibilityMode } from '../core/schema.ts'

export type HiddenReason = 'no_model' | 'not_loaded' | 'dissected' | 'isolation' | 'manual' | 'system'

export interface EffectiveVisibility {
  mode: VisibilityMode | 'absent'
  opacity: number
  reason?: HiddenReason
}

export const GHOST_OPACITY = 0.18

export const HIDDEN_REASON_LABEL: Record<HiddenReason, string> = {
  no_model: 'Bu yapının 3B modeli henüz yok',
  not_loaded: 'İlgili model henüz yüklenmedi',
  dissected: 'Sanal diseksiyonla kaldırıldı',
  isolation: 'İzolasyon dışında kaldı',
  manual: 'Elle gizlendi',
  system: 'Ait olduğu sistem kapalı',
}

/** Minimal read-only view of the content graph needed for resolution. */
export interface VisibilityGraph {
  /** Part-of ancestors, nearest first, excluding the structure itself. */
  ancestorsOf(id: StructureId): readonly StructureId[]
  primarySystemOf(id: StructureId): SystemId | undefined
  /** Whether the structure (or a descendant) has at least one model node. */
  hasModel(id: StructureId): boolean
  /** Whether at least one of the structure's model nodes is in a loaded asset. */
  isLoaded(id: StructureId, scene: SceneState): boolean
}

export function resolveVisibility(id: StructureId, scene: SceneState, g: VisibilityGraph): EffectiveVisibility {
  if (!g.hasModel(id)) return { mode: 'absent', opacity: 0, reason: 'no_model' }
  if (!g.isLoaded(id, scene)) return { mode: 'absent', opacity: 0, reason: 'not_loaded' }

  const chain = [id, ...g.ancestorsOf(id)]

  if (scene.dissected.length > 0) {
    const dissected = new Set(scene.dissected)
    if (chain.some((x) => dissected.has(x))) return { mode: 'hidden', opacity: 0, reason: 'dissected' }
  }

  if (scene.isolated.length > 0) {
    const iso = new Set(scene.isolated)
    if (!chain.some((x) => iso.has(x))) return { mode: 'hidden', opacity: 0, reason: 'isolation' }
  }

  const system = g.primarySystemOf(id)
  const systemOpacity = system !== undefined ? (scene.systemOpacity[system] ?? 1) : 1

  for (const x of chain) {
    const o = scene.visibility[x]
    if (o === 'hidden') return { mode: 'hidden', opacity: 0, reason: 'manual' }
    if (o === 'ghost') return { mode: 'ghost', opacity: Math.min(GHOST_OPACITY, systemOpacity) }
    if (o === 'visible') return { mode: 'visible', opacity: systemOpacity }
  }

  if (system !== undefined && scene.systemVisibility[system] === false) {
    return { mode: 'hidden', opacity: 0, reason: 'system' }
  }
  return { mode: 'visible', opacity: systemOpacity }
}

/** A structure can be picked in 3D only when it is rendered (visible or ghost) and not fully transparent. */
export function isSelectable(v: EffectiveVisibility): boolean {
  return (v.mode === 'visible' || v.mode === 'ghost') && v.opacity > 0.02
}
