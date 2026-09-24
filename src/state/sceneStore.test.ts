import { describe, expect, it } from 'vitest'
import { createSceneStore } from './sceneStore.ts'
import { resolveVisibility, type VisibilityGraph } from './visibility.ts'

const graph: VisibilityGraph = {
  ancestorsOf: (id) => (id === 'fma:2' ? ['fma:1'] : []),
  primarySystemOf: () => 'skeletal',
  hasModel: () => true,
  isLoaded: () => true,
}

describe('sceneStore undo/redo', () => {
  it('undoes and redoes visibility changes', () => {
    const s = createSceneStore()
    s.getState().setVisibility(['fma:1'], 'hidden')
    expect(s.getState().scene.visibility['fma:1']).toBe('hidden')
    s.getState().undo()
    expect(s.getState().scene.visibility['fma:1']).toBeUndefined()
    s.getState().redo()
    expect(s.getState().scene.visibility['fma:1']).toBe('hidden')
  })

  it('does not record selection in history', () => {
    const s = createSceneStore()
    s.getState().select(['fma:1'])
    expect(s.getState().past).toHaveLength(0)
  })

  it('dissection steps are individually undoable and ordered', () => {
    const s = createSceneStore()
    s.getState().dissect(['fma:1'])
    s.getState().dissect(['fma:3'])
    expect(s.getState().scene.dissected).toEqual(['fma:1', 'fma:3'])
    s.getState().undo()
    expect(s.getState().scene.dissected).toEqual(['fma:1'])
  })

  it('reveal un-dissects, forces visible and joins isolation', () => {
    const s = createSceneStore()
    s.getState().isolate(['fma:9'])
    s.getState().dissect(['fma:2'])
    s.getState().setSystemVisible('skeletal', false)
    s.getState().reveal(['fma:2'])
    const v = resolveVisibility('fma:2', s.getState().scene, graph)
    expect(v.mode).toBe('visible')
  })
})

describe('resolveVisibility precedence', () => {
  it('inherits hidden from ancestor and reports reason', () => {
    const s = createSceneStore()
    s.getState().setVisibility(['fma:1'], 'hidden')
    expect(resolveVisibility('fma:2', s.getState().scene, graph)).toMatchObject({ mode: 'hidden', reason: 'manual' })
  })
  it('system switch hides unless forced visible', () => {
    const s = createSceneStore()
    s.getState().setSystemVisible('skeletal', false)
    expect(resolveVisibility('fma:2', s.getState().scene, graph).reason).toBe('system')
    s.getState().setVisibility(['fma:2'], 'visible')
    expect(resolveVisibility('fma:2', s.getState().scene, graph).mode).toBe('visible')
  })
})
