import { describe, expect, it } from 'vitest'
import { quizAttemptSchema } from '../core/schema.ts'
import {
  answerCurrent,
  createQuizSession,
  createSessionState,
  finishSession,
  markCurrentUnavailable,
  nextQuestion,
  sessionResults,
  sessionView,
  skipCurrent,
  startSession,
  tickSession,
  toQuizAttempt,
} from './session.ts'
import type { QuizConfig, QuizQuestion } from './types.ts'

const q = (id: string, extra: Partial<QuizQuestion>): QuizQuestion => ({
  id,
  type: 'mcq',
  origin: 'generated',
  level: 'basic',
  prompt: `Sentetik soru ${id}`,
  options: [
    { id: 'a', text: 'Sentetik A' },
    { id: 'b', text: 'Sentetik B' },
  ],
  answer: { optionId: 'a', text: 'Sentetik A' },
  explanation: 'Sentetik açıklama',
  sources: [{ sourceId: 'src:synthetic-terms' }],
  requiresVisible: [],
  reviewStatus: 'draft',
  ...extra,
})

const questions: QuizQuestion[] = [
  q('q1', { target: 'ax:0001', systems: ['skeletal'] }),
  q('q2', { target: 'ax:0020', systems: ['muscular'] }),
  q('q3', {
    type: 'find',
    target: 'ax:0002',
    systems: ['skeletal'],
    options: undefined,
    answer: { structureId: 'ax:0002', text: 'Sentetik yapı 0002' },
    requiresVisible: ['ax:0002'],
  }),
  q('q4', { systems: [] }),
]

const practice: QuizConfig = { mode: 'name', count: 4, seed: 3 }
const exam: QuizConfig = { mode: 'exam', count: 4, seed: 3, timeLimitSec: 60, systems: ['skeletal', 'muscular'] }
const T0 = Date.parse('2026-09-24T10:00:00Z')

describe('practice session', () => {
  it('walks question → feedback → next and summarizes results', () => {
    let s = createSessionState(questions, practice)
    expect(sessionView(s, T0).phase).toBe('ready')
    s = startSession(s, T0)
    let v = sessionView(s, T0)
    expect(v).toMatchObject({ phase: 'question', position: 1, total: 4, suppressLabels: true, feedback: null, canAnswer: true })
    expect(v.question?.id).toBe('q1')

    s = answerCurrent(s, { optionId: 'a' }, T0 + 2000)
    v = sessionView(s, T0 + 2000)
    expect(v.phase).toBe('feedback')
    expect(v.suppressLabels).toBe(false)
    expect(v.feedback).toMatchObject({ correct: true, quality: 5 })
    expect(v.canNext).toBe(true)
    // Answering again during feedback changes nothing.
    expect(answerCurrent(s, { optionId: 'b' }, T0 + 2500)).toBe(s)

    s = nextQuestion(s, T0 + 3000)
    expect(sessionView(s, T0 + 3000).question?.id).toBe('q2')
    s = answerCurrent(s, { optionId: 'b' }, T0 + 30_000)
    expect(sessionView(s, T0 + 30_000).feedback?.correct).toBe(false)
    s = nextQuestion(s, T0 + 31_000)

    // Response time counts from when the question was shown.
    s = answerCurrent(s, { structureId: 'ax:0002' }, T0 + 41_000)
    expect(s.items[2]?.responseMs).toBe(10_000)
    s = nextQuestion(s, T0 + 42_000)
    s = skipCurrent(s, T0 + 43_000)
    expect(sessionView(s, T0 + 43_000).feedback?.outcome).toBe('no_answer')
    s = nextQuestion(s, T0 + 44_000)

    expect(s.phase).toBe('finished')
    expect(s.finishReason).toBe('completed')
    const r = sessionResults(s)
    expect(r).toMatchObject({ total: 4, scored: 4, answered: 3, correct: 2, incorrect: 2, skipped: 1, unanswered: 0, percent: 50 })
    expect(r?.durationMs).toBe(44_000)
    expect(r?.bySystem).toEqual([
      { key: 'skeletal', total: 2, correct: 2, percent: 100 },
      { key: 'muscular', total: 1, correct: 0, percent: 0 },
      { key: 'unassigned', total: 1, correct: 0, percent: 0 },
    ])
    expect(r?.byType.find((x) => x.key === 'mcq')).toEqual({ key: 'mcq', total: 3, correct: 1, percent: 33.3 })
    expect(r?.progressUpdates.map((u) => [u.structureId, u.correct, u.quality])).toEqual([
      ['ax:0001', true, 5],
      ['ax:0020', false, 1],
      ['ax:0002', true, 4],
    ])
  })

  it('shows a running summary before the end', () => {
    let s = startSession(createSessionState(questions, practice), T0)
    s = answerCurrent(s, { optionId: 'a' }, T0 + 1000)
    expect(sessionResults(s)?.correct).toBe(1)
  })

  it('drops unanswerable questions without scoring them', () => {
    let s = startSession(createSessionState(questions, practice), T0)
    s = markCurrentUnavailable(s, T0 + 100, 'Bu yapının 3B modeli henüz yok')
    expect(s.items[0]).toMatchObject({ status: 'unavailable', unavailableReason: 'Bu yapının 3B modeli henüz yok' })
    expect(sessionView(s, T0 + 100).question?.id).toBe('q2')
    s = finishSession(s, T0 + 200)
    const r = sessionResults(s)
    expect(r).toMatchObject({ total: 4, scored: 3, unavailable: 1, unanswered: 3, correct: 0 })
    expect(s.finishReason).toBe('ended_early')
  })

  it('finishes immediately without questions', () => {
    const s = startSession(createSessionState([], practice), T0)
    expect(s.phase).toBe('finished')
    expect(sessionResults(s)?.percent).toBe(0)
  })
})

describe('exam session', () => {
  it('gives no feedback and hides results until the end', () => {
    let s = startSession(createSessionState(questions, exam), T0)
    expect(sessionView(s, T0)).toMatchObject({ exam: true, suppressLabels: true, remainingMs: 60_000 })
    s = answerCurrent(s, { optionId: 'a' }, T0 + 1000)
    let v = sessionView(s, T0 + 1000)
    expect(v.phase).toBe('question')
    expect(v.question?.id).toBe('q2')
    expect(v.feedback).toBeNull()
    expect(v.suppressLabels).toBe(true)
    expect(sessionResults(s)).toBeNull()
    // "next" is not a way around the exam flow.
    expect(nextQuestion(s, T0 + 1500)).toBe(s)

    s = answerCurrent(s, { optionId: 'a' }, T0 + 2000)
    s = answerCurrent(s, { structureId: 'ax:0002' }, T0 + 3000)
    s = answerCurrent(s, { optionId: 'b' }, T0 + 4000)
    v = sessionView(s, T0 + 4000)
    expect(v.phase).toBe('finished')
    expect(v.suppressLabels).toBe(false)
    const r = sessionResults(s)
    expect(r).toMatchObject({ correct: 3, incorrect: 1, percent: 75, finishReason: 'completed' })
  })

  it('expires at the time limit and records open questions as unanswered', () => {
    let s = startSession(createSessionState(questions, exam), T0)
    s = answerCurrent(s, { optionId: 'a' }, T0 + 10_000)
    expect(sessionView(s, T0 + 59_000).remainingMs).toBe(1000)
    expect(sessionView(s, T0 + 61_000).phase).toBe('finished')

    const late = answerCurrent(s, { optionId: 'a' }, T0 + 61_000)
    expect(late.phase).toBe('finished')
    expect(late.finishReason).toBe('time_up')
    expect(late.items.filter((it) => it.status === 'answered')).toHaveLength(1)

    s = tickSession(s, T0 + 70_000)
    expect(s.finishedAtMs).toBe(T0 + 60_000)
    const r = sessionResults(s)
    expect(r).toMatchObject({ answered: 1, correct: 1, unanswered: 3, scored: 4, percent: 25, durationMs: 60_000 })
    // Unanswered questions are not fed into spaced repetition.
    expect(r?.progressUpdates).toHaveLength(1)
  })

  it('counts a fully answered session as completed even if the limit passes afterwards', () => {
    let s = startSession(createSessionState(questions.slice(0, 1), { ...practice, timeLimitSec: 10 }), T0)
    s = answerCurrent(s, { optionId: 'a' }, T0 + 5000)
    s = tickSession(s, T0 + 20_000)
    expect(s).toMatchObject({ phase: 'finished', finishReason: 'completed', finishedAtMs: T0 + 10_000 })
  })

  it('produces a schema-valid attempt record', () => {
    let s = startSession(createSessionState(questions, exam, { id: 'attempt-1' }), T0)
    s = answerCurrent(s, { optionId: 'a' }, T0 + 1234.6)
    s = skipCurrent(s, T0 + 2000)
    s = tickSession(s, T0 + 60_000)
    const attempt = quizAttemptSchema.parse(toQuizAttempt(s))
    expect(attempt).toMatchObject({
      id: 'attempt-1',
      mode: 'exam',
      startedAt: '2026-09-24T10:00:00.000Z',
      finishedAt: '2026-09-24T10:01:00.000Z',
    })
    expect(attempt.items).toEqual([
      { questionId: 'q1', structureId: 'ax:0001', correct: true, answeredAt: new Date(T0 + 1234.6).toISOString(), responseMs: 1235 },
      { questionId: 'q2', structureId: 'ax:0020', correct: false, answeredAt: new Date(T0 + 2000).toISOString(), responseMs: 765 },
    ])
    expect(attempt.settings).toMatchObject({
      seed: 3,
      timeLimitSec: 60,
      systems: ['skeletal', 'muscular'],
      questionCount: 4,
      unansweredQuestionIds: ['q3', 'q4'],
      finishReason: 'time_up',
    })
  })
})

describe('createQuizSession wrapper', () => {
  it('uses the injected clock and notifies subscribers', () => {
    let now = T0
    const session = createQuizSession(questions, practice, { clock: () => now })
    let notified = 0
    const unsubscribe = session.subscribe(() => notified++)
    session.start()
    now += 3000
    const g = session.answer({ optionId: 'a' })
    expect(g).toMatchObject({ correct: true, quality: 5 })
    expect(session.view().feedback?.correct).toBe(true)
    session.next()
    expect(notified).toBe(3)
    unsubscribe()
    session.skip()
    expect(notified).toBe(3)
    session.finish()
    expect(session.getState().phase).toBe('finished')
    expect(quizAttemptSchema.safeParse(session.attempt()).success).toBe(true)
  })

  it('returns no grade during an exam', () => {
    let now = T0
    const session = createQuizSession(questions, exam, { clock: () => now })
    session.start()
    now += 1000
    expect(session.answer({ optionId: 'a' })).toBeUndefined()
    expect(session.results()).toBeNull()
    now += 120_000
    session.tick()
    expect(session.getState().finishReason).toBe('time_up')
    expect(session.results()?.correct).toBe(1)
  })
})
