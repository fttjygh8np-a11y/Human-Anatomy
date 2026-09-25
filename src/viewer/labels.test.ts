import { describe, expect, it } from 'vitest'
import { LABEL_DENSITY_COUNT, chooseLabelCandidates, layoutLabels, type LabelBox } from './labels.ts'

const visible = Array.from({ length: 40 }, (_, i) => ({ id: `ax:s${i}`, size: i }))

describe('chooseLabelCandidates', () => {
  it('returns nothing when labels are off or names are suppressed (exam mode)', () => {
    const input = { selected: ['ax:s1'], emphasized: [], visible }
    expect(chooseLabelCandidates({ ...input, options: { enabled: false, density: 'high', suppressNames: false } })).toEqual([])
    expect(chooseLabelCandidates({ ...input, options: { enabled: true, density: 'high', suppressNames: true } })).toEqual([])
  })

  it('puts selected, then emphasised, then the largest visible structures', () => {
    const out = chooseLabelCandidates({
      options: { enabled: true, density: 'low', suppressNames: false },
      selected: ['ax:s1', 'ax:s1'],
      emphasized: ['ax:s2', 'ax:s1'],
      visible,
    })
    expect(out[0]).toEqual({ id: 'ax:s1', kind: 'selected' })
    expect(out[1]).toEqual({ id: 'ax:s2', kind: 'emphasis' })
    const context = out.filter((c) => c.kind === 'context')
    expect(context[0]!.id).toBe('ax:s39')
    expect(context.length).toBe(LABEL_DENSITY_COUNT.low * 2)
  })

  it('never auto-labels excluded structures (quiz targets) but keeps selected ones', () => {
    const out = chooseLabelCandidates({
      options: { enabled: true, density: 'high', suppressNames: false },
      selected: ['ax:s38'],
      emphasized: ['ax:s37'],
      visible,
      exclude: new Set(['ax:s39', 'ax:s38', 'ax:s37']),
    })
    expect(out.map((c) => c.id)).not.toContain('ax:s39')
    expect(out.map((c) => c.id)).not.toContain('ax:s37')
    expect(out[0]).toEqual({ id: 'ax:s38', kind: 'selected' })
  })

  it('offers more context labels at higher density', () => {
    const count = (density: 'low' | 'medium' | 'high') =>
      chooseLabelCandidates({ options: { enabled: true, density, suppressNames: false }, selected: [], emphasized: [], visible }).length
    expect(count('low')).toBeLessThan(count('medium'))
    expect(count('medium')).toBeLessThan(count('high'))
  })
})

describe('layoutLabels', () => {
  const vp = { width: 400, height: 300 }
  const box = (id: string, kind: LabelBox['kind'], x: number, y: number): LabelBox => ({ id, kind, x, y, w: 60, h: 18 })

  it('drops overlapping context labels but keeps mandatory ones', () => {
    const placed = layoutLabels(
      [box('ax:ctx', 'context', 100, 100), box('ax:sel', 'selected', 100, 100), box('ax:far', 'context', 300, 250)],
      vp,
      10,
    )
    const ids = placed.map((p) => p.id)
    expect(ids).toContain('ax:sel')
    expect(ids).toContain('ax:far')
    // The context label was nudged off the selected one rather than overlapping it.
    const ctx = placed.find((p) => p.id === 'ax:ctx')
    if (ctx) expect(Math.abs(ctx.py - 100)).toBeGreaterThanOrEqual(18)
  })

  it('respects the context limit and viewport bounds', () => {
    const boxes = [box('ax:a', 'context', 50, 50), box('ax:b', 'context', 200, 50), box('ax:c', 'context', 350, 50), box('ax:out', 'context', 399, 150)]
    const placed = layoutLabels(boxes, vp, 2)
    expect(placed.map((p) => p.id)).toEqual(['ax:a', 'ax:b'])
    expect(layoutLabels([box('ax:out', 'context', 399, 150)], vp, 5)).toEqual([])
  })

  it('never produces overlapping context labels', () => {
    const boxes = Array.from({ length: 30 }, (_, i) => box(`ax:${i}`, 'context', 150 + (i % 5) * 10, 150 + (i % 3) * 5))
    const placed = layoutLabels(boxes, vp, 30)
    for (const a of placed) {
      for (const b of placed) {
        if (a === b) continue
        const overlap = Math.abs(a.px - b.px) * 2 < a.w + b.w && Math.abs(a.py - b.py) * 2 < a.h + b.h
        expect(overlap).toBe(false)
      }
    }
  })
})
