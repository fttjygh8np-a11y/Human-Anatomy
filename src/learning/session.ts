/**
 * Quiz / exam session state machine (framework-agnostic).
 *
 * Pure transitions take the current time explicitly (`nowMs`) so sessions are deterministic
 * in tests; `createQuizSession` wraps them with a clock and a subscribe API that fits
 * React's useSyncExternalStore or any other UI.
 *
 * Practice modes: answer → feedback (explanation, sources) → next.
 * Exam mode: answers are recorded without feedback and the session moves on; results,
 * correctness and explanations are available only after the session has finished.
 * While a question is open (and during the whole exam) `suppressLabels` tells the viewer to
 * hide names/labels/info cards that could reveal the answer.
 */
import type { QuestionType, QuizAttempt, StructureId, SystemId } from '../core/schema.ts'
import { grade } from './grading.ts'
import type { GradeResult, QuizConfig, QuizQuestion, QuizResponse } from './types.ts'

export type ItemStatus = 'pending' | 'answered' | 'skipped' | 'unanswered' | 'unavailable'

export interface SessionItem {
  question: QuizQuestion
  status: ItemStatus
  response?: QuizResponse
  grade?: GradeResult
  /** When the question was first shown (ms epoch). */
  shownAtMs?: number
  answeredAtMs?: number
  responseMs?: number
  /** Why the question was dropped (e.g. its structure could not be shown). */
  unavailableReason?: string
}

export type SessionPhase = 'ready' | 'question' | 'feedback' | 'finished'
export type FinishReason = 'completed' | 'time_up' | 'ended_early'

export interface QuizSessionState {
  id: string
  config: QuizConfig
  exam: boolean
  phase: SessionPhase
  /** Index of the current item. */
  index: number
  items: SessionItem[]
  startedAtMs: number | null
  deadlineMs: number | null
  finishedAtMs: number | null
  finishReason: FinishReason | null
}

export interface SessionView {
  phase: SessionPhase
  exam: boolean
  /** 1-based position of the current question (0 before start). */
  position: number
  total: number
  question: QuizQuestion | null
  /** Hide names, labels and info cards that could reveal the answer. */
  suppressLabels: boolean
  /** Feedback for the current question (practice modes, after answering). Never set during an exam. */
  feedback: GradeResult | null
  /** Remaining time (ms) when the session has a time limit. */
  remainingMs: number | null
  canAnswer: boolean
  canSkip: boolean
  canNext: boolean
}

export interface BreakdownRow<K extends string> {
  key: K
  total: number
  correct: number
  /** 0..100, one decimal. */
  percent: number
}

export interface ProgressUpdate {
  structureId: StructureId
  correct: boolean
  /** SM-2 quality 0..5 (feed to UserDataStore.recordAnswer). */
  quality: number
  answeredAt: string
}

export interface SessionResults {
  finishReason: FinishReason | null
  total: number
  /** Items that count for the score (all except unavailable ones). */
  scored: number
  answered: number
  correct: number
  incorrect: number
  skipped: number
  unanswered: number
  unavailable: number
  /** 0..100, one decimal; 0 when nothing was scored. */
  percent: number
  durationMs: number | null
  bySystem: BreakdownRow<SystemId | 'unassigned'>[]
  byType: BreakdownRow<QuestionType>[]
  items: SessionItem[]
  progressUpdates: ProgressUpdate[]
}

// ---------------------------------------------------------------------------
// Pure transitions
// ---------------------------------------------------------------------------

export function createSessionState(
  questions: readonly QuizQuestion[],
  config: QuizConfig,
  opts: { id?: string } = {},
): QuizSessionState {
  return {
    id: opts.id ?? `quiz-${config.mode}-${config.seed}`,
    config,
    exam: config.mode === 'exam',
    phase: 'ready',
    index: 0,
    items: questions.map((question) => ({ question, status: 'pending' })),
    startedAtMs: null,
    deadlineMs: null,
    finishedAtMs: null,
    finishReason: null,
  }
}

function withItem(state: QuizSessionState, i: number, patch: Partial<SessionItem>): SessionItem[] {
  return state.items.map((it, j) => (j === i ? { ...it, ...patch } : it))
}

function finish(state: QuizSessionState, nowMs: number, reason: FinishReason): QuizSessionState {
  if (state.phase === 'finished') return state
  // Nothing can happen after the deadline, so the session never ends later than it.
  const at = state.deadlineMs !== null ? Math.min(nowMs, state.deadlineMs) : nowMs
  return {
    ...state,
    phase: 'finished',
    finishedAtMs: at,
    finishReason: reason,
    items: state.items.map((it) => (it.status === 'pending' ? { ...it, status: 'unanswered' } : it)),
  }
}

/** Move to the next pending item (or finish when none is left). */
function advance(state: QuizSessionState, nowMs: number): QuizSessionState {
  const next = state.items.findIndex((it, j) => j > state.index && it.status === 'pending')
  if (next === -1) return finish(state, nowMs, 'completed')
  return {
    ...state,
    phase: 'question',
    index: next,
    items: withItem(state, next, { shownAtMs: state.items[next]?.shownAtMs ?? nowMs }),
  }
}

/** Finish the session with 'time_up' when the time limit has passed. */
export function tickSession(state: QuizSessionState, nowMs: number): QuizSessionState {
  if (state.phase === 'finished' || state.phase === 'ready') return state
  if (state.deadlineMs !== null && nowMs >= state.deadlineMs) {
    return finish(state, nowMs, state.items.some((it) => it.status === 'pending') ? 'time_up' : 'completed')
  }
  return state
}

export function startSession(state: QuizSessionState, nowMs: number): QuizSessionState {
  if (state.phase !== 'ready') return state
  const limit = state.config.timeLimitSec
  const started: QuizSessionState = {
    ...state,
    startedAtMs: nowMs,
    deadlineMs: limit !== undefined && limit > 0 ? nowMs + limit * 1000 : null,
    index: -1,
  }
  return advance(started, nowMs)
}

function record(
  state: QuizSessionState,
  nowMs: number,
  status: 'answered' | 'skipped',
  response: QuizResponse | null,
): QuizSessionState {
  const s = tickSession(state, nowMs)
  if (s.phase !== 'question') return s
  const item = s.items[s.index] as SessionItem
  const responseMs = Math.max(0, Math.round(nowMs - (item.shownAtMs ?? nowMs)))
  const result = grade(item.question, response, responseMs)
  const updated: QuizSessionState = {
    ...s,
    items: withItem(s, s.index, {
      status,
      ...(response ? { response } : {}),
      grade: result,
      answeredAtMs: nowMs,
      responseMs,
    }),
  }
  return s.exam ? advance(updated, nowMs) : { ...updated, phase: 'feedback' }
}

/** Answer the current question (practice: shows feedback; exam: records and moves on). */
export function answerCurrent(state: QuizSessionState, response: QuizResponse, nowMs: number): QuizSessionState {
  return record(state, nowMs, 'answered', response)
}

/** Skip the current question (graded as no answer, quality 0). */
export function skipCurrent(state: QuizSessionState, nowMs: number): QuizSessionState {
  return record(state, nowMs, 'skipped', null)
}

/**
 * Drop the current question without scoring it — for questions whose structures cannot be
 * made visible/selectable (see prepareScene), so no unanswerable question is counted.
 */
export function markCurrentUnavailable(state: QuizSessionState, nowMs: number, reason: string): QuizSessionState {
  const s = tickSession(state, nowMs)
  if (s.phase !== 'question') return s
  return advance({ ...s, items: withItem(s, s.index, { status: 'unavailable', unavailableReason: reason }) }, nowMs)
}

/** Leave the feedback of the current question (practice modes). */
export function nextQuestion(state: QuizSessionState, nowMs: number): QuizSessionState {
  const s = tickSession(state, nowMs)
  if (s.phase !== 'feedback') return s
  return advance(s, nowMs)
}

/** End the session now; open questions are recorded as unanswered. */
export function finishSession(state: QuizSessionState, nowMs: number): QuizSessionState {
  const s = tickSession(state, nowMs)
  if (s.phase === 'finished') return s
  return finish(s, nowMs, s.items.some((it) => it.status === 'pending') ? 'ended_early' : 'completed')
}

// ---------------------------------------------------------------------------
// Views and results
// ---------------------------------------------------------------------------

export function sessionView(state: QuizSessionState, nowMs: number): SessionView {
  const s = tickSession(state, nowMs)
  const active = s.phase === 'question' || s.phase === 'feedback'
  const item = active ? s.items[s.index] : undefined
  return {
    phase: s.phase,
    exam: s.exam,
    position: active ? s.index + 1 : 0,
    total: s.items.length,
    question: item?.question ?? null,
    suppressLabels: s.exam ? s.phase !== 'finished' : s.phase === 'question',
    feedback: !s.exam && s.phase === 'feedback' ? (item?.grade ?? null) : null,
    remainingMs: s.deadlineMs === null ? null : Math.max(0, s.deadlineMs - nowMs),
    canAnswer: s.phase === 'question',
    canSkip: s.phase === 'question',
    canNext: s.phase === 'feedback',
  }
}

const pct = (correct: number, total: number) => (total === 0 ? 0 : Math.round((correct / total) * 1000) / 10)

function breakdown<K extends string>(items: readonly SessionItem[], keysOf: (q: QuizQuestion) => K[]): BreakdownRow<K>[] {
  const rows = new Map<K, { total: number; correct: number }>()
  for (const it of items) {
    for (const key of new Set(keysOf(it.question))) {
      const row = rows.get(key) ?? { total: 0, correct: 0 }
      row.total++
      if (it.grade?.correct) row.correct++
      rows.set(key, row)
    }
  }
  return [...rows.entries()]
    .map(([key, r]) => ({ key, total: r.total, correct: r.correct, percent: pct(r.correct, r.total) }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
}

/** Structure a question is about (used for progress / spaced repetition). */
export function subjectOf(q: QuizQuestion): StructureId | undefined {
  return q.target ?? q.highlight ?? q.answer.structureId
}

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * Results summary. Exam results are only available after the session has finished (null before);
 * practice sessions can show a running summary.
 */
export function sessionResults(state: QuizSessionState): SessionResults | null {
  if (state.exam && state.phase !== 'finished') return null
  const scoredItems = state.items.filter((it) => it.status !== 'unavailable')
  const count = (st: ItemStatus) => state.items.filter((it) => it.status === st).length
  const correct = scoredItems.filter((it) => it.grade?.correct).length
  const graded = scoredItems.filter((it) => it.status === 'answered' || it.status === 'skipped')
  const progressUpdates: ProgressUpdate[] = []
  for (const it of graded) {
    const id = subjectOf(it.question)
    if (!id || !it.grade || it.answeredAtMs === undefined) continue
    progressUpdates.push({ structureId: id, correct: it.grade.correct, quality: it.grade.quality, answeredAt: iso(it.answeredAtMs) })
  }
  return {
    finishReason: state.finishReason,
    total: state.items.length,
    scored: scoredItems.length,
    answered: count('answered'),
    correct,
    incorrect: graded.filter((it) => !it.grade?.correct).length,
    skipped: count('skipped'),
    unanswered: count('unanswered'),
    unavailable: count('unavailable'),
    percent: pct(correct, scoredItems.length),
    durationMs:
      state.startedAtMs === null ? null : (state.finishedAtMs ?? state.startedAtMs) - state.startedAtMs,
    bySystem: breakdown<SystemId | 'unassigned'>(scoredItems, (q) =>
      q.systems && q.systems.length > 0 ? q.systems : ['unassigned'],
    ),
    byType: breakdown<QuestionType>(scoredItems, (q) => [q.type]),
    items: state.items,
    progressUpdates,
  }
}

/**
 * Attempt record for storage (quizAttemptSchema). Only answered/skipped questions are items
 * (unanswered ones have no answer time); counts and settings go into `settings`.
 */
export function toQuizAttempt(state: QuizSessionState): QuizAttempt {
  const c = state.config
  const settings: Record<string, unknown> = {
    count: c.count,
    seed: c.seed,
    questionCount: state.items.length,
    questionIds: state.items.map((it) => it.question.id),
    unansweredQuestionIds: state.items.filter((it) => it.status === 'unanswered').map((it) => it.question.id),
    unavailableQuestionIds: state.items.filter((it) => it.status === 'unavailable').map((it) => it.question.id),
    ...(c.systems ? { systems: c.systems } : {}),
    ...(c.regions ? { regions: c.regions } : {}),
    ...(c.level ? { level: c.level } : {}),
    ...(c.timeLimitSec !== undefined ? { timeLimitSec: c.timeLimitSec } : {}),
    ...(c.onlyApproved !== undefined ? { onlyApproved: c.onlyApproved } : {}),
    ...(c.types ? { types: c.types } : {}),
    ...(c.modules ? { modules: c.modules } : {}),
    ...(state.finishReason ? { finishReason: state.finishReason } : {}),
  }
  const items: QuizAttempt['items'] = []
  for (const it of state.items) {
    if ((it.status !== 'answered' && it.status !== 'skipped') || it.answeredAtMs === undefined) continue
    const structureId = subjectOf(it.question)
    items.push({
      questionId: it.question.id,
      ...(structureId ? { structureId } : {}),
      correct: it.grade?.correct ?? false,
      answeredAt: iso(it.answeredAtMs),
      ...(it.responseMs !== undefined ? { responseMs: Math.max(0, Math.round(it.responseMs)) } : {}),
    })
  }
  return {
    id: state.id,
    mode: c.mode,
    startedAt: iso(state.startedAtMs ?? Date.now()),
    ...(state.finishedAtMs !== null ? { finishedAt: iso(state.finishedAtMs) } : {}),
    settings,
    items,
  }
}

// ---------------------------------------------------------------------------
// Stateful wrapper
// ---------------------------------------------------------------------------

export interface QuizSession {
  getState(): QuizSessionState
  subscribe(listener: () => void): () => void
  view(): SessionView
  start(): void
  /** Returns the grade in practice modes; undefined during an exam (no feedback until the end). */
  answer(response: QuizResponse): GradeResult | undefined
  skip(): void
  next(): void
  markUnavailable(reason: string): void
  /** Call periodically (e.g. every second) to enforce the time limit. */
  tick(): void
  finish(): void
  results(): SessionResults | null
  attempt(): QuizAttempt
}

export function createQuizSession(
  questions: readonly QuizQuestion[],
  config: QuizConfig,
  opts: { id?: string; clock?: () => number } = {},
): QuizSession {
  const clock = opts.clock ?? (() => Date.now())
  let state = createSessionState(questions, config, opts)
  const listeners = new Set<() => void>()
  const set = (next: QuizSessionState) => {
    if (next === state) return
    state = next
    for (const l of listeners) l()
  }
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    view: () => sessionView(state, clock()),
    start: () => set(startSession(state, clock())),
    answer(response) {
      const before = state
      set(answerCurrent(state, response, clock()))
      if (state.exam || state === before) return undefined
      return state.items[state.index]?.grade
    },
    skip: () => set(skipCurrent(state, clock())),
    next: () => set(nextQuestion(state, clock())),
    markUnavailable: (reason) => set(markCurrentUnavailable(state, clock(), reason)),
    tick: () => set(tickSession(state, clock())),
    finish: () => set(finishSession(state, clock())),
    results: () => sessionResults(state),
    attempt: () => toQuizAttempt(state),
  }
}
