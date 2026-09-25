import { describe, expect, it } from 'vitest'
import { srsStateSchema } from '../core/schema.ts'
import { clampQuality, initialSrsState, isDue, nextEase, qualityFromAnswer, reviewSm2, SM2_MIN_EASE } from './srs.ts'

const t0 = new Date('2026-09-01T10:00:00.000Z')
const days = (n: number) => new Date(t0.getTime() + n * 86_400_000)

describe('SM-2 ease factor', () => {
  it('follows the SM-2 formula for every quality', () => {
    expect(nextEase(2.5, 5)).toBeCloseTo(2.6)
    expect(nextEase(2.5, 4)).toBeCloseTo(2.5)
    expect(nextEase(2.5, 3)).toBeCloseTo(2.36)
    expect(nextEase(2.5, 2)).toBeCloseTo(2.18)
    expect(nextEase(2.5, 1)).toBeCloseTo(1.96)
    expect(nextEase(2.5, 0)).toBeCloseTo(1.7)
  })

  it('never drops below 1.3', () => {
    expect(nextEase(1.4, 0)).toBe(SM2_MIN_EASE)
    let ease = 2.5
    for (let i = 0; i < 20; i++) ease = nextEase(ease, 0)
    expect(ease).toBe(1.3)
  })

  it('clamps and rounds quality', () => {
    expect(clampQuality(7)).toBe(5)
    expect(clampQuality(-2)).toBe(0)
    expect(clampQuality(3.6)).toBe(4)
    expect(clampQuality(Number.NaN)).toBe(0)
  })
})

describe('SM-2 scheduling', () => {
  it('uses intervals 1, 6, then round(previous × EF)', () => {
    const r1 = reviewSm2(undefined, 5, t0)
    expect(r1).toMatchObject({ intervalDays: 1, repetitions: 1, lapses: 0 })
    expect(r1.ease).toBeCloseTo(2.6)
    expect(r1.dueAt).toBe(days(1).toISOString())

    const r2 = reviewSm2(r1, 5, days(1))
    expect(r2).toMatchObject({ intervalDays: 6, repetitions: 2 })
    expect(r2.ease).toBeCloseTo(2.7)
    expect(r2.dueAt).toBe(days(7).toISOString())

    // Third interval uses the EF held before this review: round(6 × 2.7) = 16.
    const r3 = reviewSm2(r2, 5, days(7))
    expect(r3).toMatchObject({ intervalDays: 16, repetitions: 3 })
    expect(r3.ease).toBeCloseTo(2.8)
    expect(r3.dueAt).toBe(days(23).toISOString())

    const r4 = reviewSm2(r3, 4, days(23))
    expect(r4.intervalDays).toBe(Math.round(16 * 2.8))
    expect(r4.ease).toBeCloseTo(2.8)
  })

  it('resets repetitions and counts a lapse when q < 3, keeping the lowered EF', () => {
    let st = reviewSm2(undefined, 5, t0)
    st = reviewSm2(st, 5, days(1))
    st = reviewSm2(st, 5, days(7))
    const failed = reviewSm2(st, 2, days(23))
    expect(failed).toMatchObject({ repetitions: 0, intervalDays: 1, lapses: 1 })
    expect(failed.ease).toBeCloseTo(2.8 - 0.32)
    expect(failed.dueAt).toBe(days(24).toISOString())

    const relearn = reviewSm2(failed, 4, days(24))
    expect(relearn).toMatchObject({ repetitions: 1, intervalDays: 1, lapses: 1 })
    const again = reviewSm2(relearn, 0, days(25))
    expect(again.lapses).toBe(2)
  })

  it('treats q = 3 as a pass', () => {
    const st = reviewSm2(undefined, 3, t0)
    expect(st).toMatchObject({ repetitions: 1, lapses: 0, intervalDays: 1 })
    expect(st.ease).toBeCloseTo(2.36)
  })

  it('produces states valid under the stored schema', () => {
    let st = initialSrsState(t0)
    expect(srsStateSchema.safeParse(st).success).toBe(true)
    for (const q of [5, 4, 3, 0, 1, 2, 5, 5]) {
      st = reviewSm2(st, q, t0)
      expect(srsStateSchema.safeParse(st).success).toBe(true)
    }
  })

  it('reports due items', () => {
    expect(isDue(undefined, t0)).toBe(true)
    const st = reviewSm2(undefined, 5, t0)
    expect(isDue(st, t0)).toBe(false)
    expect(isDue(st, days(1))).toBe(true)
  })
})

describe('qualityFromAnswer', () => {
  it('grades correct answers by speed', () => {
    expect(qualityFromAnswer(true, 3000, 5000)).toBe(5)
    expect(qualityFromAnswer(true, 5000, 5000)).toBe(5)
    expect(qualityFromAnswer(true, 8000, 5000)).toBe(4)
    expect(qualityFromAnswer(true, 20000, 5000)).toBe(3)
  })

  it('grades incorrect answers below 3', () => {
    expect(qualityFromAnswer(false, 1000, 5000)).toBe(1)
    expect(qualityFromAnswer(false, 20000, 5000)).toBe(0)
  })

  it('falls back when times are unusable', () => {
    expect(qualityFromAnswer(true, Number.NaN, 5000)).toBe(4)
    expect(qualityFromAnswer(true, 1000, 0)).toBe(4)
    expect(qualityFromAnswer(false, -1, 5000)).toBe(1)
  })
})
