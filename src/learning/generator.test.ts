import { describe, expect, it } from 'vitest'
import type { Progress, StructureId } from '../core/schema.ts'
import { grade } from './grading.ts'
import { generateQuiz, reviewQueue } from './generator.ts'
import { partOfRelatives, relationStatus, weakestStatus, withSide } from './records.ts'
import { SRC_MODELS, SRC_RELATIONS, relations, syntheticIndex } from './testing/syntheticBundle.ts'
import type { QuizConfig, QuizQuestion } from './types.ts'

const index = syntheticIndex()
const gen = (config: Partial<QuizConfig>, ctx?: Parameters<typeof generateQuiz>[2]) =>
  generateQuiz(index, { mode: 'exam', count: 10, seed: 1, ...config }, ctx)

/** Records that must never appear in a question (unsourced names, other module, variant, needs revision). */
const EXCLUDED_STRUCTURES = ['ax:0040', 'ax:0041', 'ax:0050', 'ax:0051', 'ax:0052']

/** Every structure id a question mentions (target, highlight, options, answer, dependencies). */
function mentioned(q: QuizQuestion): StructureId[] {
  return [
    q.target,
    q.highlight,
    q.answer.structureId,
    ...(q.options ?? []).map((o) => o.structureId),
    ...(q.dependsOn?.structures ?? []),
  ].filter((x): x is StructureId => !!x)
}

function expectCitable(q: QuizQuestion) {
  expect(q.sources.length).toBeGreaterThan(0)
  for (const s of q.sources) expect(index.getSource(s.sourceId), `${q.id} cites ${s.sourceId}`).toBeDefined()
}

describe('generateQuiz — general guarantees', () => {
  it('is deterministic for a seed and varies across seeds', () => {
    expect(gen({ seed: 5 })).toEqual(gen({ seed: 5 }))
    const a = gen({ seed: 5 }).questions.map((q) => q.id)
    const b = gen({ seed: 6 }).questions.map((q) => q.id)
    expect(a).not.toEqual(b)
  })

  it('only produces questions with citable sources and never uses excluded records', () => {
    for (const mode of ['find', 'name', 'relation', 'exam'] as const) {
      for (let seed = 0; seed < 5; seed++) {
        const r = gen({ mode, count: 60, seed })
        for (const q of r.questions) {
          expectCitable(q)
          for (const id of mentioned(q)) expect(EXCLUDED_STRUCTURES, `${q.id} uses ${id}`).not.toContain(id)
          // Schematic-only geometry is never the structure to find/name (its sourced name may be a distractor).
          expect([q.target, q.highlight, ...q.requiresVisible]).not.toContain('ax:0070')
        }
      }
    }
  })

  it('never silently caps: shortfalls are explained in Turkish', () => {
    const r = gen({ mode: 'find', count: 500 })
    expect(r.questions.length).toBeLessThan(500)
    expect(r.shortfallReasons[0]).toBe(`İstenen 500 sorudan yalnızca ${r.questions.length} tanesi üretilebildi.`)
    const text = r.shortfallReasons.join('\n')
    expect(text).toContain('2 yapının kaynak gösterilmiş bir adı olmadığı için')
    expect(text).toContain('3B modeli olmadığı için')
    expect(text).toContain('şematik (yer tutucu)')
    expect(text).toContain('"Düzeltme gerekli"')
    expect(text).toContain('varyasyon')
    expect(text).toContain('içerik modülleri dışında')
    expect(r.exclusions?.find((e) => e.reason === 'unsourced_name')?.count).toBe(2)
  })

  it('reports unsourced facts even when the requested count is reached', () => {
    const r = gen({ mode: 'relation', count: 1 })
    expect(r.questions).toHaveLength(1)
    expect(r.shortfallReasons).toEqual(['2 ilişki kaydı geçerli bir kaynak göstermediği için soruya dönüştürülmedi.'])
  })

  it('rejects invalid counts and incompatible type filters', () => {
    expect(gen({ count: 0 }).shortfallReasons[0]).toContain('en az 1')
    expect(gen({ count: 2.5 }).questions).toEqual([])
    const r = gen({ mode: 'find', types: ['relation'] })
    expect(r.questions).toEqual([])
    expect(r.shortfallReasons[0]).toContain('Yapıyı bul')
  })

  it('does not repeat questions and prefers distinct structures', () => {
    const r = gen({ mode: 'exam', count: 15 })
    expect(new Set(r.questions.map((q) => q.id)).size).toBe(r.questions.length)
    const subjects = r.questions.map((q) => q.target ?? q.highlight).filter(Boolean)
    expect(new Set(subjects).size).toBe(subjects.length)
  })
})

describe('filters', () => {
  it('treats levels as nested (basic ⊂ intermediate ⊂ advanced)', () => {
    const ids = (level: QuizConfig['level']) => gen({ mode: 'find', count: 100, level }).questions.map((q) => q.target)
    expect(ids('basic')).not.toContain('ax:0003')
    expect(ids('basic')).not.toContain('ax:0004')
    expect(ids('intermediate')).toContain('ax:0003')
    expect(ids('intermediate')).not.toContain('ax:0004')
    expect(ids('advanced')).toContain('ax:0004')
    for (const q of gen({ count: 100, level: 'basic' }).questions) expect(q.level).toBe('basic')
  })

  it('filters by system', () => {
    const r = gen({ mode: 'find', count: 100, systems: ['muscular'] })
    expect(r.questions.map((q) => q.target).sort()).toEqual(['ax:0020', 'ax:0021', 'ax:0022', 'ax:0023'])
    for (const q of r.questions) expect(q.systems).toContain('muscular')
  })

  it('filters by region including sub-regions', () => {
    const upper = gen({ mode: 'find', count: 100, regions: ['upper_limb'] }).questions.map((q) => q.target)
    expect(upper).toContain('ax:0001')
    expect(upper).not.toContain('ax:0004')
    expect(upper).not.toContain('ax:0023')
    const lower = gen({ mode: 'find', count: 100, regions: ['lower_limb'] }).questions.map((q) => q.target)
    expect(lower).toEqual(expect.arrayContaining(['ax:0004', 'ax:0005', 'ax:0023']))
    expect(lower).not.toContain('ax:0001')
  })

  it('onlyApproved uses approved records only, including distractors', () => {
    for (const mode of ['find', 'name', 'relation', 'exam'] as const) {
      const r = gen({ mode, count: 50, onlyApproved: true })
      expect(r.questions.length).toBeGreaterThan(0)
      for (const q of r.questions) {
        expect(q.reviewStatus).toBe('approved')
        for (const id of mentioned(q)) expect(['ax:0060', 'ax:0061', 'ax:0062', 'ax:0063']).toContain(id)
      }
      expect(r.shortfallReasons.join(' ')).toContain('uzman onaylı')
    }
  })

  it('includes schematic-only structures only when explicitly allowed', () => {
    expect(gen({ mode: 'find', count: 100 }).questions.map((q) => q.target)).not.toContain('ax:0070')
    expect(gen({ mode: 'find', count: 100, allowSchematicModels: true }).questions.map((q) => q.target)).toContain('ax:0070')
  })

  it('includes other content modules only when selected', () => {
    const r = gen({ mode: 'find', count: 100, modules: ['core', 'embryology'] })
    expect(r.questions.map((q) => q.target)).toContain('ax:0050')
  })
})

describe('find questions', () => {
  const finds = gen({ mode: 'find', count: 100 }).questions

  it('only target structures with a 3D model and require them visible', () => {
    for (const q of finds) {
      expect(q.type).toBe('find')
      expect(index.hasModel(q.target as string)).toBe(true)
      expect(q.requiresVisible).toContain(q.target)
    }
    expect(finds.map((q) => q.target)).not.toContain('ax:0030')
  })

  it('make the side explicit and grade part picks and opposite-side picks', () => {
    const q = finds.find((x) => x.id === 'gen:find:ax:0010') as QuizQuestion
    expect(q.prompt).toBe('Modelde şu yapıyı bulun ve seçin: Sentetik yapı 0010 (sağ)')
    expect(q.side).toBe('right')
    expect(q.acceptedStructureIds).toEqual(['ax:0010', 'ax:0013'])
    expect(q.wrongSideStructureIds).toEqual(['ax:0011'])
    expect(grade(q, { structureId: 'ax:0013' }).correct).toBe(true)
    expect(grade(q, { structureId: 'ax:0011' }).outcome).toBe('wrong_side')
  })

  it('cite the name and the 3D model sources', () => {
    const q = finds.find((x) => x.id === 'gen:find:ax:0001') as QuizQuestion
    expect(q.sources.map((s) => s.sourceId)).toEqual(expect.arrayContaining(['src:synthetic-terms', SRC_MODELS]))
    expect(q.explanation).toContain('Latince: Structura synthetica 0001')
  })

  it('carry the weakest review status (unverified names cap the label review)', () => {
    // ax:0005: labels/geometry expert_review_pending, names unverified, asset geometry draft.
    expect(finds.find((x) => x.target === 'ax:0005' && x.origin === 'generated')?.reviewStatus).toBe('draft')
    expect(finds.find((x) => x.target === 'ax:0060')?.reviewStatus).toBe('approved')
  })

  it('convert authored find questions and name the answer from its sourced record', () => {
    const q = finds.find((x) => x.id === 'q:syn-find-1') as QuizQuestion
    expect(q.origin).toBe('authored')
    expect(q.requiresVisible).toEqual(['ax:0005'])
    expect(q.answer).toEqual({ structureId: 'ax:0005', text: 'Sentetik yapı 0005' })
    expect(q.dependsOn?.question).toBe('q:syn-find-1')
    expect(grade(q, { structureId: 'ax:0001' }).feedback).toContain('Sentetik yapı 0005')
  })
})

describe('name questions', () => {
  const many = Array.from({ length: 25 }, (_, seed) => gen({ mode: 'name', count: 60, seed }).questions).flat()

  it('mix typed and multiple-choice questions on highlighted structures', () => {
    const types = new Set(many.map((q) => q.type))
    expect(types).toEqual(new Set(['name', 'mcq']))
    for (const q of many) {
      expect(q.highlight).toBeDefined()
      expect(q.requiresVisible).toContain(q.highlight)
    }
  })

  it('accept every sourced language and require the side for sided structures', () => {
    const typed = many.find((q) => q.id === 'gen:name:ax:0002') as QuizQuestion
    expect(typed.acceptedAnswers).toEqual(
      expect.arrayContaining(['Sentetik yapı 0002', 'Structura synthetica 0002', 'Synthetic structure 0002', 'Sentetik eşanlam 02']),
    )
    expect(grade(typed, { text: 'synthetic structure 0002' }).correct).toBe(true)
    const sided = many.find((q) => q.id === 'gen:name:ax:0010') as QuizQuestion
    expect(sided.prompt).toContain('tarafıyla birlikte')
    expect(grade(sided, { text: 'sentetik yapı 0010' }).outcome).toBe('missing_side')
    expect(grade(sided, { text: 'sağ sentetik yapı 0010' }).correct).toBe(true)
    expect(grade(sided, { text: 'Structura synthetica 0010 sinistra' }).outcome).toBe('wrong_side')
  })

  it('build sound multiple-choice options', () => {
    const mcqs = many.filter((q) => q.type === 'mcq')
    expect(mcqs.length).toBeGreaterThan(20)
    let sawTrap = false
    for (const q of mcqs) {
      const options = q.options ?? []
      expect(options.length).toBeGreaterThanOrEqual(3)
      expect(options.filter((o) => o.id === q.answer.optionId)).toHaveLength(1)
      expect(new Set(options.map((o) => o.text)).size).toBe(options.length)
      expect(new Set(options.map((o) => o.structureId)).size).toBe(options.length)
      const target = q.highlight as string
      const relatives = partOfRelatives(target, index)
      const opposite = index.getStructure(target)?.counterpartId
      for (const o of options) {
        if (o.structureId === target) continue
        expect(relatives.has(o.structureId as string), `${q.id}: part-of relative offered`).toBe(false)
        // The side-independent concept of the sided family would be partially right.
        if (['ax:0010', 'ax:0011', 'ax:0013'].includes(target)) expect(o.structureId).not.toBe('ax:0012')
        // A part never gets its opposite-side whole (or vice versa) as an option.
        if (target === 'ax:0013') expect(o.structureId).not.toBe('ax:0011')
        if (o.structureId === opposite) {
          sawTrap = true
          expect(q.prompt).toContain('sağ ve sol örnekleri ayrı seçenekler')
          expect(grade(q, { optionId: o.id }).outcome).toBe('wrong_side')
        }
      }
    }
    expect(sawTrap).toBe(true)
  })

  it('prefer distractors of the same kind', () => {
    const muscleQs = many.filter((q) => q.type === 'mcq' && q.highlight === 'ax:0020')
    const kinds = muscleQs.flatMap((q) =>
      (q.options ?? []).filter((o) => o.structureId !== 'ax:0020').map((o) => index.getStructure(o.structureId as string)?.kind),
    )
    // All three other synthetic muscles are always chosen before any other kind.
    expect(kinds.every((k) => k === 'muscle')).toBe(true)
  })
})

describe('relation questions', () => {
  const many = Array.from({ length: 20 }, (_, seed) => gen({ mode: 'relation', count: 30, seed }).questions).flat()

  it('come only from relations with citable sources', () => {
    const used = new Set(many.flatMap((q) => q.dependsOn?.relations ?? []))
    expect(used).toEqual(new Set(['rel:syn-1', 'rel:syn-2', 'rel:syn-5', 'rel:syn-8', 'rel:syn-3']))
    for (const q of many) {
      expect(q.type).toBe('relation')
      expect(q.sources.map((s) => s.sourceId)).toContain(SRC_RELATIONS)
    }
    const r = gen({ mode: 'relation', count: 30 })
    expect(r.exclusions?.find((e) => e.reason === 'unsourced_relation')?.count).toBe(2)
    expect(r.exclusions?.find((e) => e.reason === 'variant')?.count).toBe(1)
    expect(r.exclusions?.find((e) => e.reason === 'needs_revision')?.count).toBe(1)
  })

  it('use Turkish templates and state the recorded fact in the explanation', () => {
    const q = many.find((x) => x.id === 'gen:rel:rel:syn-1:forward') as QuizQuestion
    expect(q.prompt).toBe('Sentetik yapı 0020 aşağıdakilerden hangisine tutunur (insersiyo)?')
    expect(q.explanation).toBe('Kayıtlı ilişki: Sentetik yapı 0020, Sentetik yapı 0002 yapısına tutunur (insersiyo).')
    expect(q.answer.structureId).toBe('ax:0002')
    expect(q.relatedStructures).toEqual(['ax:0020', 'ax:0002'])
    const inv = many.find((x) => x.id === 'gen:rel:rel:syn-1:inverse') as QuizQuestion
    expect(inv.prompt).toBe('Aşağıdakilerden hangisi Sentetik yapı 0002 yapısına tutunur (insersiyo)?')
    expect(inv.answer.structureId).toBe('ax:0020')
  })

  it('never offer another recorded answer as a distractor and mention it instead', () => {
    const qs = many.filter((x) => x.target === 'ax:0020' && x.prompt.includes('innerve edilir'))
    expect(qs.length).toBeGreaterThan(0)
    for (const q of qs) {
      const ids = (q.options ?? []).map((o) => o.structureId)
      expect(ids.filter((id) => id === 'ax:0030' || id === 'ax:0031')).toHaveLength(1)
      expect(q.explanation).toContain('Aynı ilişki türünde kayıtlı diğer yapılar')
    }
    // Only one question per prompt: the two innervation records share it.
    expect(new Set(qs.map((q) => q.id)).size).toBe(1)
  })

  it('never offer the subject or its part-of relatives as options', () => {
    for (const q of many) {
      const rel = partOfRelatives(q.target as string, index)
      for (const o of q.options ?? []) expect(rel.has(o.structureId as string)).toBe(false)
    }
  })

  it('carry the weakest status of relation, names and distractors', () => {
    for (const q of many.filter((x) => x.dependsOn?.relations.includes('rel:syn-1'))) expect(q.reviewStatus).toBe('draft')
    const approved = gen({ mode: 'relation', count: 5, onlyApproved: true }).questions
    expect(approved.map((q) => q.id).sort()).toEqual(['gen:rel:rel:syn-8:forward', 'gen:rel:rel:syn-8:inverse'])
  })
})

describe('section and authored questions', () => {
  it('uses only authored section questions and says why', () => {
    const r = gen({ mode: 'section', count: 5 })
    expect(r.questions.map((q) => q.id)).toEqual(['q:syn-section-1'])
    expect(r.questions[0]?.requiresVisible).toEqual(['ax:0004'])
    expect(r.shortfallReasons.join(' ')).toContain('Kesit tanıma soruları otomatik üretilmez')
  })

  it('drops authored questions without citable sources or with unanswerable 3D requirements', () => {
    const r = gen({ mode: 'exam', count: 200 })
    const ids = r.questions.map((q) => q.id)
    expect(ids).toContain('q:syn-mcq-1')
    expect(ids).not.toContain('q:syn-unsourced')
    expect(ids).not.toContain('q:syn-nomodel')
    expect(r.exclusions?.find((e) => e.reason === 'unsourced_authored')?.count).toBe(1)
    expect(r.exclusions?.find((e) => e.reason === 'unanswerable_authored')?.count).toBe(1)
  })
})

describe('review mode', () => {
  const now = new Date('2026-09-24T12:00:00Z')
  const p = (structureId: string, extra: Partial<Progress> = {}): Progress => ({
    structureId,
    viewCount: 1,
    attempts: 1,
    correct: 1,
    lastResult: 'correct',
    ...extra,
  })
  const progress: Progress[] = [
    p('ax:0001', { attempts: 0, correct: 0, lastResult: undefined, lastViewedAt: '2026-09-20' }),
    p('ax:0020', { lastResult: 'incorrect', srs: { ease: 2.5, intervalDays: 1, repetitions: 0, lapses: 1, dueAt: '2026-09-30' } }),
    p('ax:0002', { srs: { ease: 2.5, intervalDays: 3, repetitions: 2, lapses: 0, dueAt: '2026-09-20' } }),
    p('ax:0003', { srs: { ease: 2.5, intervalDays: 6, repetitions: 3, lapses: 0, dueAt: '2026-10-10' } }),
    p('ax:0040'),
  ]

  it('orders due items, then mistakes, then viewed-only, then scheduled', () => {
    expect(reviewQueue(progress, now).map((x) => [x.structureId, x.tier])).toEqual([
      ['ax:0002', 'due'],
      ['ax:0020', 'mistake'],
      ['ax:0001', 'viewed'],
      ['ax:0003', 'scheduled'],
      ['ax:0040', 'scheduled'],
    ])
  })

  it('asks about due structures first', () => {
    const r = gen({ mode: 'review', count: 4 }, { progress, now })
    const subjects = r.questions.map((q) => q.target)
    expect(subjects).toEqual(['ax:0002', 'ax:0020', 'ax:0001', 'ax:0003'])
  })

  it('explains when history is missing or exhausted', () => {
    const none = gen({ mode: 'review', count: 3 }, { progress: [], now })
    expect(none.questions).toEqual([])
    expect(none.shortfallReasons.join(' ')).toContain('Tekrar için kayıtlı çalışma geçmişi yok')
    const few = gen({ mode: 'review', count: 50 }, { progress, now })
    expect(few.questions.length).toBeLessThan(50)
    expect(few.shortfallReasons.join(' ')).toContain('çalışma geçmişindeki 5 yapıdan 4 tanesi')
  })
})

describe('record helpers', () => {
  it('computes the weakest status with verification caps', () => {
    expect(weakestStatus(['approved', 'draft', 'expert_review_pending'])).toBe('draft')
    expect(weakestStatus(['draft', 'needs_revision'])).toBe('needs_revision')
    expect(weakestStatus([])).toBe('approved')
    const approvedButUnverified = { ...(relations[0] as (typeof relations)[number]), review: 'approved' as const }
    expect(relationStatus(approvedButUnverified)).toBe('source_check_pending')
    expect(relationStatus({ ...approvedButUnverified, verification: 'source_checked' })).toBe('expert_review_pending')
    expect(relationStatus({ ...approvedButUnverified, verification: 'expert_approved' })).toBe('approved')
  })

  it('adds the side to names that do not state it', () => {
    expect(withSide('Sentetik yapı', 'right')).toBe('Sentetik yapı (sağ)')
    expect(withSide('Sol sentetik yapı', 'left')).toBe('Sol sentetik yapı')
    expect(withSide('Structura synthetica dextra', 'right')).toBe('Structura synthetica dextra')
    expect(withSide('Sentetik yapı', undefined)).toBe('Sentetik yapı')
  })
})
