/**
 * Answer grading with Turkish feedback and an SM-2 quality score (0..5).
 *
 * Typed answers are compared after Turkish-aware folding (see normalize.ts); words of six or
 * more letters tolerate a single typo. When the answer is a sided instance (question.side) the
 * typed answer must state the same side; a missing or opposite side is graded as incorrect with
 * a specific explanation. 3D picks count when they hit the target or one of its parts.
 *
 * The SM-2 scheduling itself lives in src/user/srs.ts; only the quality mapping is done here.
 */
import type { QuestionType, StructureId } from '../core/schema.ts'
import { answerTokens, extractSide, matchTokens, type Side, type TokenMatch } from './normalize.ts'
import type { GradeOutcome, GradeResult, QuizQuestion, QuizResponse } from './types.ts'

/** Response-time bands per question type (ms): ≤ fast → quality 5, ≤ slow → 4, slower → 3. */
export const RESPONSE_TIME_MS: Record<QuestionType, { fast: number; slow: number }> = {
  find: { fast: 8_000, slow: 25_000 },
  name: { fast: 10_000, slow: 30_000 },
  mcq: { fast: 6_000, slow: 20_000 },
  relation: { fast: 8_000, slow: 25_000 },
  section: { fast: 10_000, slow: 30_000 },
}

const better = (a: TokenMatch, b: TokenMatch): TokenMatch => (a === 'exact' || b === 'exact' ? 'exact' : a === 'typo' || b === 'typo' ? 'typo' : 'none')

/**
 * Compare a typed answer with the accepted spellings.
 * With `side` set, the answer must state that side ("sağ …", "… dexter", "right …"), unless an
 * accepted spelling already contains the side word and the answer matches it as a whole.
 */
export function matchTypedAnswer(text: string, accepted: readonly string[], side?: Side): GradeOutcome {
  const answer = answerTokens(text)
  if (answer.length === 0) return 'no_answer'
  const { side: answerSide, rest: answerRest } = extractSide(answer)

  let whole: TokenMatch = 'none'
  let stripped: TokenMatch = 'none'
  for (const spelling of accepted) {
    const expected = answerTokens(spelling)
    if (expected.length === 0) continue
    const full = matchTokens(answer, expected)
    if (!side) {
      whole = better(whole, full)
      continue
    }
    const { side: expectedSide, rest: expectedRest } = extractSide(expected)
    if (full !== 'none' && expectedSide === side) whole = better(whole, full)
    stripped = better(stripped, matchTokens(answerRest, expectedRest))
  }

  if (whole !== 'none') return whole === 'exact' ? 'correct' : 'correct_typo'
  if (!side || stripped === 'none') return 'incorrect'
  if (answerSide === null) return 'missing_side'
  if (answerSide !== side) return 'wrong_side'
  return stripped === 'exact' ? 'correct' : 'correct_typo'
}

/** Correct answer text as shown to the learner. */
export function expectedAnswerText(q: QuizQuestion): string {
  if (q.answer.text) return q.answer.text
  const option = q.options?.find((o) => o.id === q.answer.optionId)
  return option?.text ?? ''
}

function acceptedStructures(q: QuizQuestion): StructureId[] {
  if (q.acceptedStructureIds && q.acceptedStructureIds.length > 0) return q.acceptedStructureIds
  if (q.answer.structureId) return [q.answer.structureId]
  const option = q.options?.find((o) => o.id === q.answer.optionId)
  if (option?.structureId) return [option.structureId]
  if (q.type === 'find' && q.target) return [q.target]
  return []
}

function structureOutcome(q: QuizQuestion, picked: StructureId): GradeOutcome {
  if (acceptedStructures(q).includes(picked)) return 'correct'
  if (q.wrongSideStructureIds?.includes(picked)) return 'wrong_side'
  return 'incorrect'
}

function evaluate(q: QuizQuestion, response: QuizResponse | null | undefined): GradeOutcome {
  if (!response) return 'no_answer'

  if (response.optionId !== undefined && response.optionId !== '') {
    const chosen = q.options?.find((o) => o.id === response.optionId)
    if (!chosen) return 'incorrect'
    if (q.answer.optionId !== undefined) {
      if (chosen.id === q.answer.optionId) return 'correct'
      return chosen.structureId && q.wrongSideStructureIds?.includes(chosen.structureId) ? 'wrong_side' : 'incorrect'
    }
    if (chosen.structureId && acceptedStructures(q).length > 0) return structureOutcome(q, chosen.structureId)
    return matchTypedAnswer(chosen.text, [...(q.acceptedAnswers ?? []), ...(q.answer.text ? [q.answer.text] : [])], q.side)
  }

  if (response.structureId !== undefined) {
    if (response.structureId === null) return 'no_answer'
    return structureOutcome(q, response.structureId)
  }

  if (response.text !== undefined) {
    const accepted = [...(q.acceptedAnswers ?? []), ...(q.answer.text ? [q.answer.text] : [])]
    if (accepted.length === 0) {
      const option = q.options?.find((o) => o.id === q.answer.optionId)
      if (option) accepted.push(option.text)
    }
    return matchTypedAnswer(response.text, accepted, q.side)
  }

  return 'no_answer'
}

/** SM-2 quality (0..5) from the outcome and the response time. */
export function sm2Quality(outcome: GradeOutcome, type: QuestionType, responseMs?: number): number {
  switch (outcome) {
    case 'no_answer':
      return 0
    case 'incorrect':
      return 1
    case 'wrong_side':
    case 'missing_side':
      return 2
    case 'correct':
    case 'correct_typo': {
      let quality = 4
      if (responseMs !== undefined && Number.isFinite(responseMs) && responseMs >= 0) {
        const band = RESPONSE_TIME_MS[type]
        quality = responseMs <= band.fast ? 5 : responseMs <= band.slow ? 4 : 3
      }
      return outcome === 'correct_typo' ? Math.min(quality, 4) : quality
    }
  }
}

function feedbackText(outcome: GradeOutcome, expected: string, q: QuizQuestion): string {
  const answerPart = expected ? ` Doğru cevap: ${expected}.` : ''
  switch (outcome) {
    case 'correct':
      return expected ? `Doğru. Cevap: ${expected}.` : 'Doğru.'
    case 'correct_typo':
      return `Doğru; küçük bir yazım farkı kabul edildi.${expected ? ` Doğru yazım: ${expected}.` : ''}`
    case 'wrong_side':
      return `Yapı doğru ancak taraf yanlış.${answerPart}`
    case 'missing_side':
      return `Taraf belirtilmedi. Bu yapı tarafa özgüdür; cevaba "sağ" veya "sol" ekleyin.${answerPart}`
    case 'incorrect':
      return q.type === 'find' ? `Yanlış yapı seçildi.${expected ? ` Aranan yapı: ${expected}.` : ''}` : `Yanlış.${answerPart}`
    case 'no_answer':
      return q.type === 'find' ? `Bir yapı seçilmedi.${answerPart}` : `Cevap verilmedi.${answerPart}`
  }
}

/** Grade a response. `null`/`undefined` (skipped, time up) is graded as "no answer" (quality 0). */
export function grade(q: QuizQuestion, response: QuizResponse | null | undefined, responseMs?: number): GradeResult {
  const outcome = evaluate(q, response)
  const expected = expectedAnswerText(q)
  return {
    correct: outcome === 'correct' || outcome === 'correct_typo',
    quality: sm2Quality(outcome, q.type, responseMs),
    feedback: feedbackText(outcome, expected, q),
    outcome,
    expected,
  }
}
