import { describe, expect, it, vi } from 'vitest'
import type { SceneState } from '../core/schema.ts'
import { createSceneStore, initialSceneState } from '../state/sceneStore.ts'
import {
  applyTourStep,
  goToStep,
  lessonAvailability,
  nextStep,
  planTourExit,
  planTourStep,
  prevStep,
  startTour,
} from './guidedTour.ts'
import { BASE_ASSET, lesson, syntheticIndex } from './testing/syntheticBundle.ts'

const index = syntheticIndex()
const loaded = (patch: Partial<SceneState> = {}): SceneState => ({ ...initialSceneState(), loadedAssets: [BASE_ASSET], ...patch })

describe('guided tour navigation', () => {
  it('starts at the first step and clamps navigation', () => {
    const t = startTour(lesson)
    expect(t.stepIndex).toBe(0)
    expect(prevStep(t)).toBe(t)
    expect(nextStep(t).stepIndex).toBe(1)
    expect(goToStep(t, 99).stepIndex).toBe(2)
    expect(nextStep(goToStep(t, 2)).stepIndex).toBe(2)
    expect(goToStep(t, -4).stepIndex).toBe(0)
  })
})

describe('planTourStep', () => {
  it('isolates, sets the camera, highlights and focuses', () => {
    const plan = planTourStep(lesson, 0, loaded(), index)
    expect(plan).toMatchObject({ position: 1, total: 3, isFirst: true, isLast: false, reviewStatus: 'draft', missing: [] })
    expect(plan.step.title).toBe('Adım 1')
    expect(plan.sources).toEqual([{ sourceId: 'src:synthetic-terms' }])
    expect(plan.actions).toEqual([
      { type: 'isolate', ids: ['ax:0001', 'ax:0002'] },
      { type: 'cameraPreset', preset: 'anterior' },
      { type: 'highlight', ids: ['ax:0001'], style: 'lesson' },
      { type: 'focus', ids: ['ax:0001'] },
    ])
  })

  it('loads missing models first', () => {
    const plan = planTourStep(lesson, 0, initialSceneState(), index)
    expect(plan.actions[1]).toEqual({ type: 'loadAssets', assetIds: [BASE_ASSET] })
  })

  it('leaves isolation of a previous step and reports structures without a model', () => {
    const plan = planTourStep(lesson, 1, loaded({ isolated: ['ax:0001', 'ax:0002'] }), index)
    expect(plan.actions).toEqual([
      { type: 'clearIsolation' },
      { type: 'highlight', ids: ['ax:0020'], style: 'lesson' },
      { type: 'focus', ids: ['ax:0020'] },
    ])
    expect(plan.missing).toEqual([{ id: 'ax:0030', reason: 'no_model', message: 'Bu yapının 3B modeli henüz yok' }])
  })

  it('reports unknown structures and clears the highlight', () => {
    const plan = planTourStep(lesson, 2, loaded(), index)
    expect(plan.isLast).toBe(true)
    expect(plan.missing).toEqual([{ id: 'ax:9999', reason: 'unknown_structure', message: 'Yapı içerikte bulunamadı' }])
    expect(plan.actions).toEqual([{ type: 'highlight', ids: [], style: null }])
  })

  it('makes hidden step structures visible', () => {
    const plan = planTourStep(lesson, 1, loaded({ systemVisibility: { muscular: false } }), index)
    expect(plan.actions).toContainEqual({ type: 'setVisibility', ids: ['ax:0020'], mode: 'visible' })
  })

  it('applies steps through the store and engine effects', () => {
    const store = createSceneStore(loaded())
    const effects = { cameraPreset: vi.fn(), focus: vi.fn(), highlight: vi.fn() }
    let t = startTour(lesson)
    applyTourStep(store, t, index, effects)
    expect(store.getState().scene.isolated).toEqual(['ax:0001', 'ax:0002'])
    expect(store.getState().lastAction).toBe('Ders adımı: Adım 1')
    expect(effects.cameraPreset).toHaveBeenCalledWith('anterior')
    expect(effects.focus).toHaveBeenCalledWith(['ax:0001'])
    expect(effects.highlight).toHaveBeenCalledWith(['ax:0001'], 'lesson')

    t = nextStep(t)
    applyTourStep(store, t, index, effects)
    expect(store.getState().scene.isolated).toEqual([])

    const exit = planTourExit(loaded({ isolated: ['ax:0001'] }))
    expect(exit).toEqual([{ type: 'highlight', ids: [], style: null }, { type: 'clearIsolation' }])
    expect(planTourExit(loaded())).toEqual([{ type: 'highlight', ids: [], style: null }])
  })

  it('summarizes lesson availability', () => {
    const a = lessonAvailability(lesson, index)
    expect(a.total).toBe(5)
    expect(a.missing.map((m) => [m.id, m.reason])).toEqual([
      ['ax:0030', 'no_model'],
      ['ax:9999', 'unknown_structure'],
    ])
  })
})
