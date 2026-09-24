import { describe, expect, it } from 'vitest'
import { GHOST_OPACITY } from '../state/visibility.ts'
import {
  HIGHLIGHT_COLORS,
  SELECTION_COLOR,
  computeNodeStyle,
  hashString,
  jitterColor,
  pickHighlight,
  styleKey,
  type NodeStyleInput,
} from './styles.ts'

const base: NodeStyleInput = {
  vis: { mode: 'visible', opacity: 1 },
  replaced: false,
  selected: false,
  hovered: false,
  highlight: null,
}

describe('computeNodeStyle', () => {
  it('renders visible structures opaque and selectable', () => {
    const s = computeNodeStyle(base)
    expect(s).toMatchObject({ visible: true, opacity: 1, transparent: false, depthWrite: true, selectable: true, ghost: false, solid: true })
    expect(s.emissiveIntensity).toBe(0)
  })

  it('renders ghosts transparent without depth writes, still selectable', () => {
    const s = computeNodeStyle({ ...base, vis: { mode: 'ghost', opacity: GHOST_OPACITY } })
    expect(s).toMatchObject({ visible: true, transparent: true, depthWrite: false, ghost: true, solid: false, selectable: true })
    expect(s.opacity).toBeCloseTo(GHOST_OPACITY)
  })

  it('hides hidden, absent and replaced nodes and makes them unpickable', () => {
    for (const vis of [
      { mode: 'hidden' as const, opacity: 0, reason: 'manual' as const },
      { mode: 'absent' as const, opacity: 0, reason: 'not_loaded' as const },
    ]) {
      const s = computeNodeStyle({ ...base, vis })
      expect(s.visible).toBe(false)
      expect(s.selectable).toBe(false)
    }
    const r = computeNodeStyle({ ...base, replaced: true })
    expect(r.visible).toBe(false)
    expect(r.selectable).toBe(false)
  })

  it('treats reduced system opacity as transparent', () => {
    const s = computeNodeStyle({ ...base, vis: { mode: 'visible', opacity: 0.5 } })
    expect(s.transparent).toBe(true)
    expect(s.ghost).toBe(false)
    expect(s.solid).toBe(false)
  })

  it('fully transparent structures are not selectable', () => {
    const s = computeNodeStyle({ ...base, vis: { mode: 'visible', opacity: 0.01 } })
    expect(s.selectable).toBe(false)
  })

  it('applies highlight over selection over hover', () => {
    expect(computeNodeStyle({ ...base, hovered: true }).emissiveIntensity).toBeGreaterThan(0)
    expect(computeNodeStyle({ ...base, selected: true, hovered: true }).emissive).toBe(SELECTION_COLOR)
    expect(computeNodeStyle({ ...base, selected: true, highlight: 'quiz_wrong' }).emissive).toBe(HIGHLIGHT_COLORS.quiz_wrong)
    expect(computeNodeStyle({ ...base, vis: { mode: 'hidden', opacity: 0 }, selected: true }).emissiveIntensity).toBe(0)
  })

  it('style keys change with visible differences only', () => {
    const a = computeNodeStyle(base)
    expect(styleKey(a)).toBe(styleKey(computeNodeStyle(base)))
    expect(styleKey(a)).not.toBe(styleKey(computeNodeStyle({ ...base, selected: true })))
  })
})

describe('highlight priority', () => {
  it('prefers quiz feedback over lesson/relation emphasis', () => {
    expect(pickHighlight([])).toBeNull()
    expect(pickHighlight(['relation', 'lesson'])).toBe('lesson')
    expect(pickHighlight(['relation', 'quiz_target', 'quiz_correct'])).toBe('quiz_correct')
    expect(pickHighlight(['quiz_correct', 'quiz_wrong'])).toBe('quiz_wrong')
  })
})

describe('colour jitter', () => {
  it('is deterministic and stays close to the base colour', () => {
    const a = jitterColor('#808080', 'node-a')
    expect(a).toBe(jitterColor('#808080', 'node-a'))
    expect(a).toMatch(/^#[0-9a-f]{6}$/)
    const v = parseInt(a.slice(1, 3), 16)
    expect(Math.abs(v - 128)).toBeLessThanOrEqual(Math.ceil(128 * 0.07) + 1)
  })

  it('hashes strings with FNV-1a', () => {
    expect(hashString('')).toBe(0x811c9dc5)
    expect(hashString('a')).toBe(0xe40c292c)
  })
})
