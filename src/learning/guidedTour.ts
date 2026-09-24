/**
 * Guided learning ("Rehberli öğrenme"): step runner for Lesson records.
 *
 * Each step declares what to show, whether to isolate it, what to focus and a camera preset.
 * `planTourStep` turns a step into scene actions for the current scene (pure); navigation
 * helpers are pure state transitions. Structures that cannot be shown (unknown id, no 3D
 * model) are reported per step instead of being silently dropped.
 */
import type { Lesson, ReviewStatus, SceneState, SourceRef, StructureId } from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import type { SceneStoreApi } from '../state/sceneStore.ts'
import { planEnsureSelectable, type VisibilityBlock } from './prepareScene.ts'
import { applySceneActions, simulateSceneAction, type ApplyResult, type SceneEffects } from './sceneActions.ts'
import type { SceneAction } from './types.ts'

export type LessonStep = Lesson['steps'][number]

export interface TourState {
  lesson: Lesson
  /** Current step index (0-based). */
  stepIndex: number
}

export interface TourStepPlan {
  lessonId: string
  lessonTitle: string
  stepIndex: number
  /** 1-based position for display ("Adım 2 / 5"). */
  position: number
  total: number
  isFirst: boolean
  isLast: boolean
  step: LessonStep
  sources: SourceRef[]
  /** Review status of the lesson (shown as a badge; lessons are never presented as approved unless they are). */
  reviewStatus: ReviewStatus
  actions: SceneAction[]
  /** Structures of this step that cannot be shown, with the Turkish reason. */
  missing: VisibilityBlock[]
}

const clampIndex = (lesson: Lesson, i: number) => Math.min(Math.max(0, Math.trunc(i)), Math.max(0, lesson.steps.length - 1))

export function startTour(lesson: Lesson): TourState {
  return { lesson, stepIndex: 0 }
}

export function nextStep(state: TourState): TourState {
  return goToStep(state, state.stepIndex + 1)
}

export function prevStep(state: TourState): TourState {
  return goToStep(state, state.stepIndex - 1)
}

export function goToStep(state: TourState, stepIndex: number): TourState {
  const i = clampIndex(state.lesson, stepIndex)
  return i === state.stepIndex ? state : { ...state, stepIndex: i }
}

/** Scene actions for one lesson step against the current scene (pure). */
export function planTourStep(lesson: Lesson, stepIndex: number, scene: SceneState, index: ContentIndex): TourStepPlan {
  const i = clampIndex(lesson, stepIndex)
  const step = lesson.steps[i] as LessonStep
  const missing: VisibilityBlock[] = []
  const actions: SceneAction[] = []
  let sim = scene
  const push = (a: SceneAction) => {
    actions.push(a)
    sim = simulateSceneAction(sim, a)
  }

  const targets = [...new Set([...step.show, ...step.focus])]
  const showable: StructureId[] = []
  for (const id of targets) {
    if (!index.getStructure(id)) missing.push({ id, reason: 'unknown_structure', message: 'Yapı içerikte bulunamadı' })
    else if (!index.hasModel(id)) missing.push({ id, reason: 'no_model', message: 'Bu yapının 3B modeli henüz yok' })
    else showable.push(id)
  }

  if (step.isolate && showable.length > 0) push({ type: 'isolate', ids: showable })
  else if (sim.isolated.length > 0) push({ type: 'clearIsolation' })

  const ensure = planEnsureSelectable(showable, sim, index, { avoidCues: false })
  for (const a of ensure.actions) push(a)
  missing.push(...ensure.blocked)
  const blockedIds = new Set(ensure.blocked.map((b) => b.id))

  if (step.camera) push({ type: 'cameraPreset', preset: step.camera })
  const focus = step.focus.filter((id) => showable.includes(id) && !blockedIds.has(id))
  if (focus.length > 0) {
    push({ type: 'highlight', ids: focus, style: 'lesson' })
    push({ type: 'focus', ids: focus })
  } else {
    push({ type: 'highlight', ids: [], style: null })
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    stepIndex: i,
    position: i + 1,
    total: lesson.steps.length,
    isFirst: i === 0,
    isLast: i === lesson.steps.length - 1,
    step,
    sources: step.sources,
    reviewStatus: lesson.review,
    actions,
    missing,
  }
}

/** Actions when leaving a tour: drop the lesson highlight and any isolation the tour left behind. */
export function planTourExit(scene: SceneState): SceneAction[] {
  const actions: SceneAction[] = [{ type: 'highlight', ids: [], style: null }]
  if (scene.isolated.length > 0) actions.push({ type: 'clearIsolation' })
  return actions
}

/** Plan and apply a step through the store (one undo step per step) and the engine effects. */
export function applyTourStep(
  store: SceneStoreApi,
  state: TourState,
  index: ContentIndex,
  effects?: SceneEffects,
): { plan: TourStepPlan; result: ApplyResult } {
  const plan = planTourStep(state.lesson, state.stepIndex, store.getState().scene, index)
  const result = applySceneActions(store, plan.actions, effects, `Ders adımı: ${plan.step.title}`)
  return { plan, result }
}

/** Structures of a lesson that cannot be shown in 3D (for an availability note before starting). */
export function lessonAvailability(lesson: Lesson, index: ContentIndex): { total: number; missing: VisibilityBlock[] } {
  const ids = [...new Set(lesson.steps.flatMap((s) => [...s.show, ...s.focus]))]
  const missing: VisibilityBlock[] = []
  for (const id of ids) {
    if (!index.getStructure(id)) missing.push({ id, reason: 'unknown_structure', message: 'Yapı içerikte bulunamadı' })
    else if (!index.hasModel(id)) missing.push({ id, reason: 'no_model', message: 'Bu yapının 3B modeli henüz yok' })
  }
  return { total: ids.length, missing }
}
