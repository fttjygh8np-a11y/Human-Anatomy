/**
 * Scene preparation for questions: make every `requiresVisible` structure visible and
 * selectable before the question is shown, so no question is unanswerable because of the
 * current view (hidden, dissected, isolated away, system switched off, not loaded, …).
 *
 * Planning is pure (simulated against the scene with resolveVisibility/isSelectable);
 * `applyQuestionScene` commits the plan through the scene store in one undo step.
 */
import type { SceneState, StructureId, VisibilityMode } from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import type { SceneStoreApi } from '../state/sceneStore.ts'
import {
  HIDDEN_REASON_LABEL,
  isSelectable,
  resolveVisibility,
  type EffectiveVisibility,
  type HiddenReason,
} from '../state/visibility.ts'
import { applySceneActions, simulateSceneAction, type ApplyResult, type SceneEffects } from './sceneActions.ts'
import type { GradeResult, QuizQuestion, QuizResponse, SceneAction } from './types.ts'

export type BlockReason = HiddenReason | 'unknown_structure'

export interface VisibilityBlock {
  id: StructureId
  reason: BlockReason
  /** Turkish explanation for the learner. */
  message: string
}

export interface EnsurePlan {
  actions: SceneAction[]
  /** Structures that cannot be made visible (e.g. no 3D model): questions needing them must be skipped. */
  blocked: VisibilityBlock[]
  /** Simulated scene after the store-level actions (asset loads assumed successful). */
  scene: SceneState
}

export interface ScenePlan extends EnsurePlan {
  /** True when nothing is blocked (after pending asset loads finish). */
  ready: boolean
  /** Assets that must finish loading before the structures can be picked. */
  pendingAssets: string[]
}

export interface EnsureOptions {
  /**
   * Prefer changes that do not single the structure out (switch its whole system on, clear
   * isolation, lift the ancestor's override) — used when the structure itself is the answer.
   */
  avoidCues: boolean
}

const BLOCK_MESSAGE: Record<BlockReason, string> = {
  ...HIDDEN_REASON_LABEL,
  unknown_structure: 'Yapı içerikte bulunamadı',
}

const MAX_FIX_STEPS = 8

/** Nearest element of the part-of chain (self first) carrying the given explicit override. */
function overrideHolder(id: StructureId, scene: SceneState, index: ContentIndex, mode: VisibilityMode): StructureId {
  for (const x of [id, ...index.ancestorsOf(id)]) if (scene.visibility[x] === mode) return x
  return id
}

/** One corrective action for the current visibility, or null when it cannot be fixed. */
function nextFix(
  id: StructureId,
  v: EffectiveVisibility,
  scene: SceneState,
  index: ContentIndex,
  opts: EnsureOptions,
): SceneAction | null {
  const system = index.primarySystemOf(id)
  switch (v.reason) {
    case 'no_model':
      return null
    case 'not_loaded': {
      const missing = index.assetsFor(id).filter((a) => !scene.loadedAssets.includes(a))
      if (missing.length === 0) return null
      const base = missing.filter((a) => index.getAsset(a)?.lod !== 'detail')
      return { type: 'loadAssets', assetIds: base.length > 0 ? base : missing }
    }
    case 'dissected':
      return { type: 'restoreDissected', ids: [id, ...index.ancestorsOf(id)].filter((x) => scene.dissected.includes(x)) }
    case 'isolation':
      return opts.avoidCues ? { type: 'clearIsolation' } : { type: 'isolate', ids: [...scene.isolated, id] }
    case 'manual':
      return {
        type: 'setVisibility',
        ids: [opts.avoidCues ? overrideHolder(id, scene, index, 'hidden') : id],
        mode: 'visible',
      }
    case 'system':
      return opts.avoidCues && system
        ? { type: 'setSystemVisible', system, visible: true }
        : { type: 'setVisibility', ids: [id], mode: 'visible' }
    case undefined:
      break
  }
  if (v.mode === 'ghost') {
    return { type: 'setVisibility', ids: [opts.avoidCues ? overrideHolder(id, scene, index, 'ghost') : id], mode: 'visible' }
  }
  if (v.mode === 'visible' && !isSelectable(v) && system) return { type: 'setSystemOpacity', system, opacity: 1 }
  return null
}

/** Plan the changes that make `ids` fully visible and selectable (pure). */
export function planEnsureSelectable(
  ids: readonly StructureId[],
  scene: SceneState,
  index: ContentIndex,
  opts: EnsureOptions = { avoidCues: false },
): EnsurePlan {
  const actions: SceneAction[] = []
  const blocked: VisibilityBlock[] = []
  let sim = scene
  for (const id of new Set(ids)) {
    if (!index.getStructure(id)) {
      blocked.push({ id, reason: 'unknown_structure', message: BLOCK_MESSAGE.unknown_structure })
      continue
    }
    for (let step = 0; ; step++) {
      const v = resolveVisibility(id, sim, index)
      if (v.mode === 'visible' && isSelectable(v)) break
      const fix = step < MAX_FIX_STEPS ? nextFix(id, v, sim, index, opts) : null
      if (!fix) {
        const reason = v.reason ?? 'manual'
        blocked.push({ id, reason, message: BLOCK_MESSAGE[reason] })
        break
      }
      actions.push(fix)
      sim = simulateSceneAction(sim, fix)
    }
  }
  return { actions, blocked, scene: sim }
}

function withReadiness(plan: EnsurePlan): ScenePlan {
  const pendingAssets = [
    ...new Set(plan.actions.flatMap((a) => (a.type === 'loadAssets' ? a.assetIds : []))),
  ]
  return { ...plan, ready: plan.blocked.length === 0, pendingAssets }
}

/**
 * Scene plan for showing a question: clears the selection (its info card could reveal the
 * answer), makes required structures visible and selectable without singling out a 'find'
 * target, and highlights/focuses the structure of a 'name'/'mcq' question.
 */
export function planQuestionScene(q: QuizQuestion, scene: SceneState, index: ContentIndex): ScenePlan {
  const actions: SceneAction[] = []
  let sim = scene
  if (scene.selected.length > 0) {
    actions.push({ type: 'clearSelection' })
    sim = simulateSceneAction(sim, { type: 'clearSelection' })
  }
  const ensure = planEnsureSelectable(q.requiresVisible, sim, index, { avoidCues: !q.highlight })
  actions.push(...ensure.actions)
  const highlightBlocked = q.highlight ? ensure.blocked.some((b) => b.id === q.highlight) : true
  if (q.highlight && !highlightBlocked) {
    actions.push({ type: 'highlight', ids: [q.highlight], style: 'quiz_target' }, { type: 'focus', ids: [q.highlight] })
  } else {
    actions.push({ type: 'highlight', ids: [], style: null })
  }
  return withReadiness({ actions, blocked: ensure.blocked, scene: ensure.scene })
}

/**
 * Scene plan after answering (explanation view): show the related structures, mark a wrong
 * pick and the correct structure, and focus them. Structures without a model are skipped.
 */
export function planAnswerReveal(
  q: QuizQuestion,
  scene: SceneState,
  index: ContentIndex,
  outcome?: { grade?: GradeResult; response?: QuizResponse | null },
): ScenePlan {
  const correctId = q.answer.structureId ?? (q.type === 'find' ? q.target : undefined) ?? q.highlight
  const related = [
    ...new Set([...(q.relatedStructures ?? []), ...(correctId ? [correctId] : [])]),
  ].filter((id) => index.hasModel(id))
  const ensure = planEnsureSelectable(related, scene, index, { avoidCues: false })
  const shown = related.filter((id) => !ensure.blocked.some((b) => b.id === id))
  const actions = [...ensure.actions]
  const picked = outcome?.response?.structureId
  if (outcome?.grade && !outcome.grade.correct && picked && picked !== correctId && index.hasModel(picked)) {
    actions.push({ type: 'highlight', ids: [picked], style: 'quiz_wrong' })
  }
  if (correctId && shown.includes(correctId)) actions.push({ type: 'highlight', ids: [correctId], style: 'quiz_correct' })
  if (shown.length > 0) actions.push({ type: 'focus', ids: shown })
  return withReadiness({ actions, blocked: ensure.blocked, scene: ensure.scene })
}

/** Plan and apply the question scene through the store (one undo step) and the engine effects. */
export function applyQuestionScene(
  store: SceneStoreApi,
  q: QuizQuestion,
  index: ContentIndex,
  effects?: SceneEffects,
): { plan: ScenePlan; result: ApplyResult } {
  const plan = planQuestionScene(q, store.getState().scene, index)
  const result = applySceneActions(store, plan.actions, effects, 'Soru için görünüm hazırlandı')
  return { plan, result }
}

/** Whether a question can be answered in the current scene after preparation (no blocked structure). */
export function isAnswerable(q: QuizQuestion, scene: SceneState, index: ContentIndex): boolean {
  return planEnsureSelectable(q.requiresVisible, scene, index).blocked.length === 0
}
