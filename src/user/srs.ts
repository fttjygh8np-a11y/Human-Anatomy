/**
 * Spaced repetition: SuperMemo SM-2 (pure functions, no I/O).
 *
 *  - quality q ∈ 0..5 (rounded and clamped).
 *  - q >= 3 (correct): interval 1 day, then 6 days, then round(previous interval × EF);
 *    repetitions + 1.
 *  - q < 3 (incorrect): repetitions reset to 0, interval 1 day, lapses + 1.
 *  - EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)), never below 1.3. The interval
 *    for this review uses the EF held *before* this update (as in the published SM-2
 *    description), and the EF is updated after every review, including failed ones.
 */
import type { SrsState } from '../core/schema.ts'

export const SM2_INITIAL_EASE = 2.5
export const SM2_MIN_EASE = 1.3
const DAY_MS = 24 * 60 * 60 * 1000

export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 0
  return Math.min(5, Math.max(0, Math.round(quality)))
}

export function nextEase(ease: number, quality: number): number {
  const q = clampQuality(quality)
  const updated = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // Rounded to avoid accumulating floating-point noise in stored records.
  return Math.max(SM2_MIN_EASE, Math.round(updated * 10000) / 10000)
}

/** State of an item that has never been reviewed (due immediately). */
export function initialSrsState(now: Date = new Date()): SrsState {
  return { ease: SM2_INITIAL_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now.toISOString() }
}

/** Applies one review with the given quality (0..5) and returns the new state. */
export function reviewSm2(prev: SrsState | undefined, quality: number, now: Date = new Date()): SrsState {
  const state = prev ?? initialSrsState(now)
  const q = clampQuality(quality)
  let { repetitions, lapses, intervalDays } = state
  if (q >= 3) {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.max(1, Math.round(intervalDays * state.ease))
    repetitions += 1
  } else {
    repetitions = 0
    intervalDays = 1
    lapses += 1
  }
  return {
    ease: nextEase(state.ease, q),
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
  }
}

export function isDue(state: SrsState | undefined, now: Date = new Date()): boolean {
  if (!state) return true
  return Date.parse(state.dueAt) <= now.getTime()
}

/**
 * Derives an SM-2 quality from correctness and response time.
 *
 *  correct:   within the expected time -> 5, up to twice the expected time -> 4, slower -> 3
 *  incorrect: answered -> 1, more than twice the expected time (gave up / timed out) -> 0
 *
 * Invalid or missing times (non-finite, negative, expectedMs <= 0) give 4 / 1.
 */
export function qualityFromAnswer(correct: boolean, responseMs: number, expectedMs: number): number {
  const valid = Number.isFinite(responseMs) && responseMs >= 0 && Number.isFinite(expectedMs) && expectedMs > 0
  if (!valid) return correct ? 4 : 1
  const ratio = responseMs / expectedMs
  if (correct) {
    if (ratio <= 1) return 5
    if (ratio <= 2) return 4
    return 3
  }
  return ratio > 2 ? 0 : 1
}
