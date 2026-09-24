import { describe, expect, it } from 'vitest'
import { expectedAnswerText, grade, matchTypedAnswer, sm2Quality } from './grading.ts'
import { answerTokens, editDistance, extractSide, foldText, matchTokens, normalizeAnswer } from './normalize.ts'
import type { QuizQuestion } from './types.ts'

const base: Omit<QuizQuestion, 'id' | 'type' | 'answer'> = {
  origin: 'generated',
  level: 'basic',
  prompt: 'Sentetik soru',
  explanation: 'Sentetik açıklama',
  sources: [{ sourceId: 'src:synthetic-terms' }],
  requiresVisible: [],
  reviewStatus: 'draft',
}

const nameQ = (extra: Partial<QuizQuestion> = {}): QuizQuestion => ({
  ...base,
  id: 'gen:name:ax:0001',
  type: 'name',
  highlight: 'ax:0001',
  acceptedAnswers: ['Sentetik yapı', 'Structura synthetica', 'Synthetic structure'],
  answer: { structureId: 'ax:0001', text: 'Sentetik yapı' },
  ...extra,
})

describe('normalization', () => {
  it('folds Turkish letters and diacritics case-insensitively', () => {
    expect(foldText('İSTANBUL ılık IŞIK Şğçöü')).toBe('istanbul ilik isik sgcou')
    expect(foldText('Ætiologia Œdema')).toBe('aetiologia oedema')
    expect(foldText('crâne')).toBe('crane')
  })

  it('tokenizes, joins apostrophes, splits hyphens and expands Latin abbreviations', () => {
    expect(answerTokens('  M. Biceps-Brachii ')).toEqual(['musculus', 'biceps', 'brachii'])
    expect(answerTokens("Douglas'ın boşluğu")).toEqual(['douglasin', 'boslugu'])
    expect(normalizeAnswer('a.synthetica')).toBe('arteria synthetica')
    expect(normalizeAnswer('Lig. syntheticum')).toBe('ligamentum syntheticum')
    // A bare letter without a period is not an abbreviation.
    expect(answerTokens('a synthetic')).toEqual(['a', 'synthetic'])
  })

  it('computes optimal string alignment distance with transpositions and early exit', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('sentetik', 'sentteik')).toBe(1)
    expect(editDistance('abc', 'abc')).toBe(0)
    expect(editDistance('abcdef', 'uvwxyz', 1)).toBe(2)
  })

  it('tolerates one edit only in words of at least six letters', () => {
    expect(matchTokens(['sentetk'], ['sentetik'])).toBe('typo')
    expect(matchTokens(['ilium'], ['ileum'])).toBe('none')
    expect(matchTokens(['yap'], ['yapi'])).toBe('none')
    expect(matchTokens(['sentetikyapi'], ['sentetik', 'yapi'])).toBe('exact')
    expect(matchTokens(['sentetk', 'yapi'], ['sentetik', 'yapi'])).toBe('typo')
    expect(matchTokens(['sentek', 'yapi'], ['sentetik', 'yapi'])).toBe('none')
  })

  it('detects side words in Turkish, Latin and English', () => {
    expect(extractSide(answerTokens('Sağ taraftaki sentetik yapı')).side).toBe('right')
    expect(extractSide(answerTokens('sağ taraftaki sentetik yapı')).rest).toEqual(['sentetik', 'yapi'])
    expect(extractSide(answerTokens('Structura synthetica sinistra')).side).toBe('left')
    expect(extractSide(answerTokens('right synthetic structure')).side).toBe('right')
    expect(extractSide(answerTokens('sağ sol yapı')).side).toBe('both')
    expect(extractSide(answerTokens('solunum yapısı')).side).toBeNull()
  })
})

describe('typed answers', () => {
  it('accepts every language and Turkish keyboard variants', () => {
    for (const text of ['Sentetik yapı', 'sentetik yapi', 'SENTETİK YAPI', 'Structura synthetica', 'synthetic structure']) {
      expect(grade(nameQ(), { text }).outcome).toBe('correct')
    }
  })

  it('accepts a single typo in long words only', () => {
    const typo = grade(nameQ(), { text: 'sentetk yapı' }, 1000)
    expect(typo.outcome).toBe('correct_typo')
    expect(typo.correct).toBe(true)
    expect(typo.quality).toBe(4)
    expect(typo.feedback).toContain('yazım farkı')
    expect(grade(nameQ(), { text: 'sentetik yap' }).correct).toBe(false)
    expect(grade(nameQ(), { text: 'sntetk yapı' }).correct).toBe(false)
  })

  it('requires the side for sided structures', () => {
    const q = nameQ({ side: 'right', answer: { structureId: 'ax:0010', text: 'Sentetik yapı (sağ)' } })
    expect(grade(q, { text: 'sağ sentetik yapı' }).outcome).toBe('correct')
    expect(grade(q, { text: 'Structura synthetica dextra' }).outcome).toBe('correct')
    expect(grade(q, { text: 'right synthetic structure' }).outcome).toBe('correct')
    expect(grade(q, { text: 'Sentetik yapı (sağ)' }).outcome).toBe('correct')

    const missing = grade(q, { text: 'sentetik yapı' })
    expect(missing.outcome).toBe('missing_side')
    expect(missing.correct).toBe(false)
    expect(missing.quality).toBe(2)
    expect(missing.feedback).toContain('Taraf belirtilmedi')

    const wrong = grade(q, { text: 'sol sentetik yapı' })
    expect(wrong.outcome).toBe('wrong_side')
    expect(wrong.feedback).toContain('taraf yanlış')
    expect(grade(q, { text: 'sağ sol sentetik yapı' }).outcome).toBe('wrong_side')
  })

  it('does not confuse names that contain a side word intrinsically', () => {
    // Unpaired record whose name contains a side word: no side stripping at all.
    expect(matchTypedAnswer('ductus syntheticus sinister', ['Ductus syntheticus dexter'])).toBe('incorrect')
    expect(matchTypedAnswer('ductus syntheticus dexter', ['Ductus syntheticus dexter'])).toBe('correct')
    // Sided record whose name already states the side.
    expect(matchTypedAnswer('atrium syntheticum dextrum', ['Atrium syntheticum dextrum'], 'right')).toBe('correct')
    expect(matchTypedAnswer('atrium syntheticum sinistrum', ['Atrium syntheticum dextrum'], 'right')).toBe('wrong_side')
    expect(matchTypedAnswer('atrium syntheticum', ['Atrium syntheticum dextrum'], 'right')).toBe('missing_side')
  })

  it('treats empty text as no answer', () => {
    const r = grade(nameQ(), { text: '   ' })
    expect(r.outcome).toBe('no_answer')
    expect(r.quality).toBe(0)
    expect(r.feedback).toContain('Doğru cevap: Sentetik yapı')
  })
})

describe('3D picks and options', () => {
  const findQ: QuizQuestion = {
    ...base,
    id: 'gen:find:ax:0010',
    type: 'find',
    target: 'ax:0010',
    answer: { structureId: 'ax:0010', text: 'Sentetik yapı 0010 (sağ)' },
    requiresVisible: ['ax:0010'],
    acceptedStructureIds: ['ax:0010', 'ax:0013'],
    wrongSideStructureIds: ['ax:0011'],
    side: 'right',
  }

  it('grades picks of the target, its parts, the opposite side and others', () => {
    expect(grade(findQ, { structureId: 'ax:0010' }).correct).toBe(true)
    expect(grade(findQ, { structureId: 'ax:0013' }).correct).toBe(true)
    const side = grade(findQ, { structureId: 'ax:0011' })
    expect(side.outcome).toBe('wrong_side')
    expect(side.quality).toBe(2)
    const other = grade(findQ, { structureId: 'ax:0002' })
    expect(other.outcome).toBe('incorrect')
    expect(other.quality).toBe(1)
    expect(other.feedback).toBe('Yanlış yapı seçildi. Aranan yapı: Sentetik yapı 0010 (sağ).')
    const none = grade(findQ, { structureId: null })
    expect(none.outcome).toBe('no_answer')
    expect(none.feedback).toContain('Bir yapı seçilmedi')
    expect(grade(findQ, null).quality).toBe(0)
  })

  it('grades option answers and side traps', () => {
    const mcq: QuizQuestion = {
      ...base,
      id: 'gen:mcq:ax:0010',
      type: 'mcq',
      highlight: 'ax:0010',
      options: [
        { id: 'a', text: 'Sentetik yapı 0010 (sol)', structureId: 'ax:0011' },
        { id: 'b', text: 'Sentetik yapı 0010 (sağ)', structureId: 'ax:0010' },
        { id: 'c', text: 'Sentetik yapı 0002', structureId: 'ax:0002' },
      ],
      answer: { optionId: 'b', structureId: 'ax:0010' },
      wrongSideStructureIds: ['ax:0011'],
    }
    expect(grade(mcq, { optionId: 'b' }).correct).toBe(true)
    expect(grade(mcq, { optionId: 'a' }).outcome).toBe('wrong_side')
    expect(grade(mcq, { optionId: 'c' }).outcome).toBe('incorrect')
    expect(grade(mcq, { optionId: 'zz' }).outcome).toBe('incorrect')
    expect(expectedAnswerText(mcq)).toBe('Sentetik yapı 0010 (sağ)')
    expect(grade(mcq, { optionId: 'c' }).feedback).toBe('Yanlış. Doğru cevap: Sentetik yapı 0010 (sağ).')
  })

  it('accepts a relation answer by option or by picking the structure', () => {
    const relQ: QuizQuestion = {
      ...base,
      id: 'gen:rel:x',
      type: 'relation',
      target: 'ax:0020',
      options: [
        { id: 'a', text: 'Sentetik yapı 0002', structureId: 'ax:0002' },
        { id: 'b', text: 'Sentetik yapı 0003', structureId: 'ax:0003' },
      ],
      answer: { optionId: 'a', structureId: 'ax:0002', text: 'Sentetik yapı 0002' },
      acceptedStructureIds: ['ax:0002'],
    }
    expect(grade(relQ, { optionId: 'a' }).correct).toBe(true)
    expect(grade(relQ, { structureId: 'ax:0002' }).correct).toBe(true)
    expect(grade(relQ, { structureId: 'ax:0003' }).correct).toBe(false)
    expect(grade(relQ, { text: 'sentetik yapi 0002' }).correct).toBe(true)
  })
})

describe('SM-2 quality', () => {
  it('maps correctness and response time to 0..5', () => {
    expect(sm2Quality('correct', 'mcq', 2000)).toBe(5)
    expect(sm2Quality('correct', 'mcq', 10_000)).toBe(4)
    expect(sm2Quality('correct', 'mcq', 60_000)).toBe(3)
    expect(sm2Quality('correct', 'mcq')).toBe(4)
    expect(sm2Quality('correct_typo', 'name', 1000)).toBe(4)
    expect(sm2Quality('correct_typo', 'name', 60_000)).toBe(3)
    expect(sm2Quality('wrong_side', 'find', 1000)).toBe(2)
    expect(sm2Quality('missing_side', 'name')).toBe(2)
    expect(sm2Quality('incorrect', 'find', 1000)).toBe(1)
    expect(sm2Quality('no_answer', 'find')).toBe(0)
  })

  it('is part of every grade result', () => {
    const r = grade(nameQ(), { text: 'Sentetik yapı' }, 3000)
    expect(r).toMatchObject({ correct: true, quality: 5, outcome: 'correct', expected: 'Sentetik yapı' })
    expect(r.feedback).toBe('Doğru. Cevap: Sentetik yapı.')
  })
})
