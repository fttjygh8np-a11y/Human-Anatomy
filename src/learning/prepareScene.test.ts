import { describe, expect, it, vi } from 'vitest'
import type { SceneState } from '../core/schema.ts'
import { createSceneStore, initialSceneState } from '../state/sceneStore.ts'
import { isSelectable, resolveVisibility } from '../state/visibility.ts'
import { grade } from './grading.ts'
import {
  applyQuestionScene,
  isAnswerable,
  planAnswerReveal,
  planEnsureSelectable,
  planQuestionScene,
} from './prepareScene.ts'
import { applySceneActions } from './sceneActions.ts'
import { BASE_ASSET, syntheticIndex } from './testing/syntheticBundle.ts'
import type { QuizQuestion } from './types.ts'

const index = syntheticIndex()

const scene = (patch: Partial<SceneState> = {}): SceneState => ({
  ...initialSceneState(),
  loadedAssets: [BASE_ASSET],
  ...patch,
})

const question = (type: 'find' | 'name', id: string, extra: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: `test:${type}:${id}`,
  type,
  origin: 'generated',
  level: 'basic',
  prompt: 'Sentetik soru',
  target: id,
  ...(type === 'name' ? { highlight: id } : {}),
  answer: { structureId: id, text: 'Sentetik yapı' },
  explanation: 'Sentetik açıklama',
  sources: [{ sourceId: 'src:synthetic-terms' }],
  requiresVisible: [id],
  reviewStatus: 'draft',
  ...extra,
})

const find = (id: string, extra?: Partial<QuizQuestion>) => question('find', id, extra)
const name = (id: string, extra?: Partial<QuizQuestion>) => question('name', id, extra)

const storeActions = (q: QuizQuestion, s: SceneState) =>
  planQuestionScene(q, s, index).actions.filter((a) => !['highlight', 'focus', 'loadAssets'].includes(a.type))

describe('planQuestionScene', () => {
  it('loads the base asset (not the detail one) when the model is not loaded', () => {
    const plan = planQuestionScene(find('ax:0003'), initialSceneState(), index)
    expect(plan.actions[0]).toEqual({ type: 'loadAssets', assetIds: [BASE_ASSET] })
    expect(plan.pendingAssets).toEqual([BASE_ASSET])
    expect(plan.ready).toBe(true)
  })

  it('does nothing to an already selectable structure except clearing the highlight', () => {
    const plan = planQuestionScene(find('ax:0001'), scene(), index)
    expect(plan.actions).toEqual([{ type: 'highlight', ids: [], style: null }])
  })

  it('switches a hidden system on for find questions instead of singling the target out', () => {
    const s = scene({ systemVisibility: { skeletal: false } })
    expect(storeActions(find('ax:0001'), s)).toEqual([{ type: 'setSystemVisible', system: 'skeletal', visible: true }])
    expect(storeActions(name('ax:0001'), s)).toEqual([{ type: 'setVisibility', ids: ['ax:0001'], mode: 'visible' }])
  })

  it('clears isolation for find questions and extends it for highlighted questions', () => {
    const s = scene({ isolated: ['ax:0002'] })
    expect(storeActions(find('ax:0001'), s)).toEqual([{ type: 'clearIsolation' }])
    expect(storeActions(name('ax:0001'), s)).toEqual([{ type: 'isolate', ids: ['ax:0002', 'ax:0001'] }])
  })

  it('restores a dissected ancestor', () => {
    const s = scene({ dissected: ['ax:0010', 'ax:0020'] })
    expect(storeActions(find('ax:0013'), s)).toEqual([{ type: 'restoreDissected', ids: ['ax:0010'] }])
  })

  it('lifts a hidden or ghost override (on the ancestor when avoiding cues)', () => {
    const hidden = scene({ visibility: { 'ax:0010': 'hidden' } })
    expect(storeActions(find('ax:0013'), hidden)).toEqual([{ type: 'setVisibility', ids: ['ax:0010'], mode: 'visible' }])
    expect(storeActions(name('ax:0013'), hidden)).toEqual([{ type: 'setVisibility', ids: ['ax:0013'], mode: 'visible' }])
    const ghost = scene({ visibility: { 'ax:0001': 'ghost' } })
    expect(storeActions(find('ax:0001'), ghost)).toEqual([{ type: 'setVisibility', ids: ['ax:0001'], mode: 'visible' }])
  })

  it('restores the opacity of a fully transparent system', () => {
    const s = scene({ systemOpacity: { skeletal: 0 } })
    expect(storeActions(find('ax:0001'), s)).toEqual([{ type: 'setSystemOpacity', system: 'skeletal', opacity: 1 }])
  })

  it('clears the selection first (its info card could reveal the answer)', () => {
    const plan = planQuestionScene(find('ax:0001'), scene({ selected: ['ax:0001'] }), index)
    expect(plan.actions[0]).toEqual({ type: 'clearSelection' })
    expect(plan.scene.selected).toEqual([])
  })

  it('highlights and focuses the structure of a name question', () => {
    const plan = planQuestionScene(name('ax:0002'), scene(), index)
    expect(plan.actions).toEqual([
      { type: 'highlight', ids: ['ax:0002'], style: 'quiz_target' },
      { type: 'focus', ids: ['ax:0002'] },
    ])
  })

  it('reports structures that cannot be shown', () => {
    const plan = planQuestionScene(find('ax:0030', { requiresVisible: ['ax:0030', 'ax:9999'] }), scene(), index)
    expect(plan.ready).toBe(false)
    expect(plan.blocked).toEqual([
      { id: 'ax:0030', reason: 'no_model', message: 'Bu yapının 3B modeli henüz yok' },
      { id: 'ax:9999', reason: 'unknown_structure', message: 'Yapı içerikte bulunamadı' },
    ])
    expect(isAnswerable(find('ax:0030'), scene(), index)).toBe(false)
    expect(isAnswerable(find('ax:0001'), scene({ isolated: ['ax:0020'] }), index)).toBe(true)
  })

  it('resolves combined obstacles until the structure is selectable', () => {
    const s = scene({ systemVisibility: { skeletal: false }, isolated: ['ax:0020'], dissected: ['ax:0010'], loadedAssets: [] })
    const plan = planEnsureSelectable(['ax:0013'], s, index, { avoidCues: true })
    expect(plan.blocked).toEqual([])
    expect(plan.actions.map((a) => a.type)).toEqual(['loadAssets', 'restoreDissected', 'clearIsolation', 'setSystemVisible'])
    const v = resolveVisibility('ax:0013', plan.scene, index)
    expect(v.mode).toBe('visible')
    expect(isSelectable(v)).toBe(true)
  })
})

describe('applying plans through the scene store', () => {
  it('commits all store changes as one undo step and routes engine actions', () => {
    const initial = scene({
      systemVisibility: { skeletal: false },
      isolated: ['ax:0020'],
      dissected: ['ax:0010'],
      selected: ['ax:0002'],
    })
    const store = createSceneStore(initial)
    const highlight = vi.fn()
    const { plan, result } = applyQuestionScene(store, find('ax:0013'), index, { highlight })
    expect(plan.ready).toBe(true)
    expect(result.storeChanged).toBe(true)
    expect(result.deferred).toEqual([])
    expect(highlight).toHaveBeenCalledWith([], null)

    const after = store.getState().scene
    const v = resolveVisibility('ax:0013', after, index)
    expect(isSelectable(v)).toBe(true)
    expect(after.selected).toEqual([])
    expect(after.loadedAssets).toEqual([BASE_ASSET])
    expect(store.getState().past).toHaveLength(1)
    expect(store.getState().lastAction).toBe('Soru için görünüm hazırlandı')

    store.getState().undo()
    const undone = store.getState().scene
    expect(undone.isolated).toEqual(['ax:0020'])
    expect(undone.dissected).toEqual(['ax:0010'])
    expect(undone.systemVisibility).toEqual({ skeletal: false })
  })

  it('does not touch the history when nothing changes and defers unhandled engine actions', async () => {
    const store = createSceneStore(scene())
    const { result } = applyQuestionScene(store, name('ax:0001'), index)
    expect(result.storeChanged).toBe(false)
    expect(store.getState().past).toHaveLength(0)
    expect(result.deferred.map((a) => a.type)).toEqual(['highlight', 'focus'])
    await expect(result.done).resolves.toBeUndefined()
  })

  it('never marks assets as loaded itself and waits for the loader', async () => {
    const store = createSceneStore(initialSceneState())
    let resolveLoad: () => void = () => {}
    const loadAssets = vi.fn(() => new Promise<void>((r) => (resolveLoad = r)))
    const result = applySceneActions(store, [{ type: 'loadAssets', assetIds: [BASE_ASSET] }], { loadAssets })
    expect(loadAssets).toHaveBeenCalledWith([BASE_ASSET])
    expect(store.getState().scene.loadedAssets).toEqual([])
    let finished = false
    void result.done.then(() => (finished = true))
    await Promise.resolve()
    expect(finished).toBe(false)
    resolveLoad()
    await result.done
    expect(finished).toBe(true)
  })

  it('applies selection-only changes without an undo entry', () => {
    const store = createSceneStore(scene({ selected: ['ax:0001'] }))
    applySceneActions(store, [{ type: 'clearSelection' }])
    expect(store.getState().scene.selected).toEqual([])
    expect(store.getState().past).toHaveLength(0)
  })
})

describe('planAnswerReveal', () => {
  it('shows related structures, marks a wrong pick and the correct structure', () => {
    const q = find('ax:0010', { relatedStructures: ['ax:0010'], acceptedStructureIds: ['ax:0010', 'ax:0013'] })
    const response = { structureId: 'ax:0002' }
    const plan = planAnswerReveal(q, scene({ isolated: ['ax:0002'] }), index, { grade: grade(q, response), response })
    expect(plan.actions).toEqual([
      { type: 'isolate', ids: ['ax:0002', 'ax:0010'] },
      { type: 'highlight', ids: ['ax:0002'], style: 'quiz_wrong' },
      { type: 'highlight', ids: ['ax:0010'], style: 'quiz_correct' },
      { type: 'focus', ids: ['ax:0010'] },
    ])
  })

  it('skips related structures without a model', () => {
    const q = find('ax:0020', { type: 'relation', requiresVisible: [], relatedStructures: ['ax:0020', 'ax:0030'] })
    const plan = planAnswerReveal(q, scene(), index)
    expect(plan.actions).toEqual([
      { type: 'highlight', ids: ['ax:0020'], style: 'quiz_correct' },
      { type: 'focus', ids: ['ax:0020'] },
    ])
  })
})
