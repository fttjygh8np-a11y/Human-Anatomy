/**
 * Question generation from content records.
 *
 * Every generated question is backed by records that cite existing sources; a fact without a
 * citable source never becomes a question (it is reported instead). The question's review
 * status is the weakest status of every record it depends on (names shown, geometry used,
 * relation asked, distractor names shown), so the UI can say honestly when expert review is
 * still pending. Fewer questions than requested are always explained in Turkish.
 */
import type {
  Progress,
  Question,
  QuestionType,
  Relation,
  RelationType,
  ReviewStatus,
  SourceRef,
  Structure,
  StructureId,
  SystemId,
} from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import { nameStatesSide, normalizeAnswer } from './normalize.ts'
import {
  allSpellings,
  citableSources,
  dedupeSources,
  descendantsOf,
  displayName,
  geometryStatus,
  LEVEL_RANK,
  maxLevel,
  modelSources,
  nameStatus,
  onlySchematicModel,
  oppositeSideIds,
  conceptFamily,
  partOfRelatives,
  relationStatus,
  sideOf,
  sourcedNames,
  weakestStatus,
  withSide,
  type SourcedName,
} from './records.ts'
import { createRng, pick, shuffle, type Rng } from './rng.ts'
import type {
  ContentModuleId,
  ExclusionReason,
  GenerationExclusion,
  GenerationReport,
  NameLang,
  QuizConfig,
  QuizMode,
  QuizOption,
  QuizQuestion,
} from './types.ts'

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Question types each mode draws from (further narrowed by QuizConfig.types). */
export const MODE_QUESTION_TYPES: Record<QuizMode, readonly QuestionType[]> = {
  find: ['find'],
  name: ['name', 'mcq'],
  relation: ['relation'],
  section: ['section'],
  review: ['find', 'name', 'mcq', 'relation', 'section'],
  exam: ['find', 'name', 'mcq', 'relation', 'section'],
}

export const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const
/** Distractors per multiple-choice question (4 options). */
export const DISTRACTOR_COUNT = 3
/** Below this many distractors a multiple-choice question is not generated. */
export const MIN_DISTRACTORS = 2
/** Share of sided name questions that deliberately offer the opposite side (with an explicit warning). */
const SIDE_TRAP_PROBABILITY = 0.25

/** Relation types whose answer is symmetric (A ~ B ⇔ B ~ A). */
const SYMMETRIC_RELATIONS: ReadonlySet<RelationType> = new Set(['continuous_with', 'articulates_with', 'adjacent_to'])
/** Spatial relation types: distractors are preferred from other regions (fewer accidental true answers). */
const SPATIAL_RELATIONS: ReadonlySet<RelationType> = new Set([
  'adjacent_to',
  'bounded_by',
  'contains',
  'passes_through',
  'located_in_compartment',
])

// ---------------------------------------------------------------------------
// Turkish templates (generic, per relation type — no anatomical content)
// ---------------------------------------------------------------------------

type Template = (name: string) => string

/** Question prompts. forward: subject = relation.from, answer = relation.to; inverse the other way round. */
export const RELATION_PROMPTS: Record<RelationType, { forward: Template; inverse: Template }> = {
  part_of: {
    forward: (a) => `${a} aşağıdakilerden hangisinin bir parçasıdır?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısının bir parçasıdır?`,
  },
  branch_of: {
    forward: (a) => `${a} aşağıdakilerden hangisinin dalıdır?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısının dalıdır?`,
  },
  tributary_of: {
    forward: (a) => `${a} aşağıdakilerden hangisinin koludur (döküldüğü damar)?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısının koludur?`,
  },
  continuous_with: {
    forward: (a) => `${a} aşağıdakilerden hangisi ile devamlılık gösterir?`,
    inverse: (b) => `${b} aşağıdakilerden hangisi ile devamlılık gösterir?`,
  },
  arterial_supply: {
    forward: (a) => `${a} yapısının arteriyel beslenmesi aşağıdakilerden hangisi ile sağlanır?`,
    inverse: (b) => `${b} aşağıdakilerden hangisini besler?`,
  },
  venous_drainage: {
    forward: (a) => `${a} yapısının venöz dönüşü aşağıdakilerden hangisine olur?`,
    inverse: (b) => `Aşağıdakilerden hangisinin venöz dönüşü ${b} yapısına olur?`,
  },
  lymphatic_drainage: {
    forward: (a) => `${a} yapısının lenfatik drenajı aşağıdakilerden hangisine olur?`,
    inverse: (b) => `Aşağıdakilerden hangisinin lenfatik drenajı ${b} yapısına olur?`,
  },
  innervated_by: {
    forward: (a) => `${a} aşağıdakilerden hangisi tarafından innerve edilir?`,
    inverse: (b) => `${b} aşağıdakilerden hangisini innerve eder?`,
  },
  origin_on: {
    forward: (a) => `${a} aşağıdakilerden hangisinden başlar (origo)?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısından başlar (origo)?`,
  },
  insertion_on: {
    forward: (a) => `${a} aşağıdakilerden hangisine tutunur (insersiyo)?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısına tutunur (insersiyo)?`,
  },
  articulates_with: {
    forward: (a) => `${a} aşağıdakilerden hangisi ile eklem yapar?`,
    inverse: (b) => `${b} aşağıdakilerden hangisi ile eklem yapar?`,
  },
  adjacent_to: {
    forward: (a) => `${a} aşağıdakilerden hangisi ile komşuluk gösterir?`,
    inverse: (b) => `${b} aşağıdakilerden hangisi ile komşuluk gösterir?`,
  },
  passes_through: {
    forward: (a) => `${a} aşağıdakilerden hangisinin içinden geçer?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısının içinden geçer?`,
  },
  contains: {
    forward: (a) => `${a} aşağıdakilerden hangisini içerir?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısının içinde bulunur?`,
  },
  bounded_by: {
    forward: (a) => `${a} aşağıdakilerden hangisi tarafından sınırlanır?`,
    inverse: (b) => `${b} aşağıdakilerden hangisini sınırlar?`,
  },
  member_of_group: {
    forward: (a) => `${a} aşağıdaki gruplardan hangisine aittir?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} grubunun üyesidir?`,
  },
  located_in_compartment: {
    forward: (a) => `${a} aşağıdaki kompartımanlardan hangisinde bulunur?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} kompartımanında bulunur?`,
  },
  acts_on_joint: {
    forward: (a) => `${a} aşağıdaki eklemlerden hangisi üzerinde etkilidir?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} üzerinde etkilidir?`,
  },
  attaches_to: {
    forward: (a) => `${a} aşağıdakilerden hangisine tutunur?`,
    inverse: (b) => `Aşağıdakilerden hangisi ${b} yapısına tutunur?`,
  },
}

/** Statement of the recorded relation (explanation shown after answering). */
export const RELATION_FACTS: Record<RelationType, (from: string, to: string) => string> = {
  part_of: (a, b) => `${a}, ${b} yapısının bir parçasıdır.`,
  branch_of: (a, b) => `${a}, ${b} yapısının dalıdır.`,
  tributary_of: (a, b) => `${a}, ${b} yapısının koludur.`,
  continuous_with: (a, b) => `${a}, ${b} ile devamlılık gösterir.`,
  arterial_supply: (a, b) => `${a} yapısının arteriyel beslenmesi ${b} ile sağlanır.`,
  venous_drainage: (a, b) => `${a} yapısının venöz dönüşü ${b} yapısına olur.`,
  lymphatic_drainage: (a, b) => `${a} yapısının lenfatik drenajı ${b} yapısına olur.`,
  innervated_by: (a, b) => `${a}, ${b} tarafından innerve edilir.`,
  origin_on: (a, b) => `${a}, ${b} yapısından başlar (origo).`,
  insertion_on: (a, b) => `${a}, ${b} yapısına tutunur (insersiyo).`,
  articulates_with: (a, b) => `${a}, ${b} ile eklem yapar.`,
  adjacent_to: (a, b) => `${a}, ${b} ile komşuluk gösterir.`,
  passes_through: (a, b) => `${a}, ${b} yapısının içinden geçer.`,
  contains: (a, b) => `${a}, ${b} yapısını içerir.`,
  bounded_by: (a, b) => `${a}, ${b} tarafından sınırlanır.`,
  member_of_group: (a, b) => `${a}, ${b} grubunun üyesidir.`,
  located_in_compartment: (a, b) => `${a}, ${b} kompartımanında bulunur.`,
  acts_on_joint: (a, b) => `${a}, ${b} üzerinde etkilidir.`,
  attaches_to: (a, b) => `${a}, ${b} yapısına tutunur.`,
}

export const EXCLUSION_MESSAGES: Record<ExclusionReason, (n: number) => string> = {
  missing_structure: (n) => `${n} kayıt, içerikte bulunmayan bir yapıya bağlı olduğu için kullanılmadı.`,
  module: (n) => `${n} kayıt seçili içerik modülleri dışında (ör. pediatri, embriyoloji) olduğu için kullanılmadı.`,
  variant: (n) => `${n} kayıt anatomik varyasyon olarak işaretli olduğu için standart soru havuzuna alınmadı.`,
  needs_revision: (n) => `${n} kayıt "Düzeltme gerekli" durumunda olduğu için soru üretiminde kullanılmadı.`,
  unsourced_name: (n) => `${n} yapının kaynak gösterilmiş bir adı olmadığı için bu yapılarla soru üretilmedi.`,
  unsourced_relation: (n) => `${n} ilişki kaydı geçerli bir kaynak göstermediği için soruya dönüştürülmedi.`,
  unsourced_authored: (n) => `${n} hazır sorunun kaynağı bulunamadığı için soru kullanılmadı.`,
  no_model: (n) => `${n} yapının 3B modeli olmadığı için "Yapıyı bul" ve "Adını söyle" soruları üretilemedi.`,
  schematic_model: (n) =>
    `${n} yapı yalnızca şematik (yer tutucu) modelle temsil edildiği için 3B model üzerinde sorulmadı.`,
  unanswerable_authored: (n) =>
    `${n} hazır soru, 3B modeli bulunmayan yapıların gösterilmesini gerektirdiği için çözülemez olurdu; kullanılmadı.`,
  not_approved: (n) => `Yalnızca uzman onaylı içerik istendiği için henüz onaylanmamış ${n} kayıt kullanılmadı.`,
  insufficient_distractors: (n) => `${n} soru için yeterli sayıda uygun seçenek (çeldirici) bulunamadı.`,
  region_unassigned: (n) => `${n} yapıya henüz bölge atanmadığı için bölge filtresine dahil edilemedi.`,
}

/** Reasons reported even when the requested count was reached (unsourced facts are never silent). */
const ALWAYS_REPORTED: ReadonlySet<ExclusionReason> = new Set(['unsourced_name', 'unsourced_relation', 'unsourced_authored'])

const REASON_ORDER: readonly ExclusionReason[] = [
  'unsourced_name',
  'unsourced_relation',
  'unsourced_authored',
  'no_model',
  'schematic_model',
  'unanswerable_authored',
  'not_approved',
  'needs_revision',
  'insufficient_distractors',
  'region_unassigned',
  'variant',
  'module',
  'missing_structure',
]

const TYPE_LABEL: Record<QuestionType, string> = {
  find: 'Yapıyı bul',
  name: 'Adını söyle (yazarak)',
  mcq: 'Adını söyle (seçenekli)',
  relation: 'Komşuluk ve bağlantı',
  section: 'Kesit tanıma',
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** A structure together with the sourced name used to display it. */
interface Named {
  s: Structure
  name: SourcedName
  /** Display text with side made explicit when the record is a sided instance. */
  text: string
  /** Normalized text (option de-duplication). */
  folded: string
  status: ReviewStatus
}

interface Candidate {
  id: string
  type: QuestionType
  /** Structure the question is about (one question per subject where possible; SRS key). */
  subject?: StructureId
  build(rng: Rng): QuizQuestion | ExclusionReason
}

interface Ctx {
  index: ContentIndex
  config: QuizConfig
  lang: NameLang
  onlyApproved: boolean
  allowSchematic: boolean
  modules: ReadonlySet<ContentModuleId>
  maxLevelRank: number
  systems: ReadonlySet<SystemId> | null
  regions: ReadonlySet<string> | null
  excluded: Map<ExclusionReason, Set<string>>
  namedCache: Map<StructureId, Named | ExclusionReason>
  namedPool: Named[] | null
}

function exclude(ctx: Ctx, reason: ExclusionReason, recordId: string): void {
  let set = ctx.excluded.get(reason)
  if (!set) {
    set = new Set()
    ctx.excluded.set(reason, set)
  }
  set.add(recordId)
}

function regionClosure(index: ContentIndex, regionIds: readonly string[]): Set<string> {
  const out = new Set(regionIds)
  let grew = true
  while (grew) {
    grew = false
    for (const r of index.bundle.regions) {
      if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
        out.add(r.id)
        grew = true
      }
    }
  }
  return out
}

function matchesSystems(ctx: Ctx, systems: readonly SystemId[]): boolean {
  return !ctx.systems || systems.some((x) => ctx.systems?.has(x))
}

function matchesRegions(ctx: Ctx, regions: readonly string[]): boolean {
  return !ctx.regions || regions.some((x) => ctx.regions?.has(x))
}

/** System, region and level filters (the learner's chosen scope; not a data-quality exclusion). */
function inScope(ctx: Ctx, s: Structure): boolean {
  return matchesSystems(ctx, s.systems) && matchesRegions(ctx, s.regions) && LEVEL_RANK[s.detailLevel] <= ctx.maxLevelRank
}

/** Name eligibility of a structure for being shown (as subject, answer or distractor). */
function named(ctx: Ctx, s: Structure): Named | ExclusionReason {
  const cached = ctx.namedCache.get(s.id)
  if (cached !== undefined) return cached
  let out: Named | ExclusionReason
  if (!ctx.modules.has(s.module)) out = 'module'
  else if (s.variation.isVariant) out = 'variant'
  else if (s.review.labels === 'needs_revision') out = 'needs_revision'
  else {
    const name = displayName(s, ctx.index, ctx.lang)
    if (!name) out = 'unsourced_name'
    else {
      const text = withSide(name.value, sideOf(s))
      out = { s, name, text, folded: normalizeAnswer(text), status: nameStatus(s, name.entry) }
    }
  }
  ctx.namedCache.set(s.id, out)
  return out
}

/** All structures whose names may be shown as options (respecting onlyApproved). */
function namedPool(ctx: Ctx): Named[] {
  if (!ctx.namedPool) {
    const pool: Named[] = []
    for (const s of ctx.index.bundle.structures) {
      const n = named(ctx, s)
      if (typeof n === 'string') continue
      if (ctx.onlyApproved && n.status !== 'approved') continue
      pool.push(n)
    }
    ctx.namedPool = pool
  }
  return ctx.namedPool
}

function modelIssue(ctx: Ctx, id: StructureId): ExclusionReason | null {
  const s = ctx.index.getStructure(id)
  if (!s) return 'missing_structure'
  if (s.review.geometry === 'needs_revision') return 'needs_revision'
  if (!ctx.index.hasModel(id)) return 'no_model'
  if (!ctx.allowSchematic && onlySchematicModel(id, ctx.index)) return 'schematic_model'
  return null
}

const shares = <T>(a: readonly T[], b: readonly T[]) => a.some((x) => b.includes(x))

/**
 * Pick up to `want` distractors: the most similar candidates first (same name language, kind,
 * system, region, side); equally similar candidates are ordered by the seeded RNG so quizzes
 * vary. An option text is never repeated.
 */
function pickDistractors(
  pool: readonly Named[],
  score: (n: Named) => number,
  want: number,
  usedTexts: Set<string>,
  rng: Rng,
): Named[] {
  // Stable sort after a seeded shuffle = random tie-breaking.
  const ranked = shuffle(pool, rng)
    .map((n) => ({ n, score: score(n) }))
    .sort((a, b) => b.score - a.score)
  const picked: Named[] = []
  for (const { n } of ranked) {
    if (picked.length >= want) break
    if (usedTexts.has(n.folded)) continue
    usedTexts.add(n.folded)
    picked.push(n)
  }
  return picked
}

/**
 * Similarity weights for distractors. Format consistency comes first so the answer is never the
 * odd one out (same name language; sided options next to sided options), then kind, system, region.
 */
const W_LANG = 5
const W_KIND = 4
const W_SIDE = 3
const W_SYSTEM = 2
const W_REGION = 2

function toOptions(items: readonly Named[]): QuizOption[] {
  return items.map((n, i) => ({ id: OPTION_IDS[i] ?? `o${i}`, text: n.text, structureId: n.s.id }))
}

const LANG_LABEL: Record<NameLang, string> = { tr: 'Türkçe', la: 'Latince', en: 'İngilizce' }

function otherNamesLine(names: readonly SourcedName[], shown: SourcedName): string {
  const others = names.filter((n) => n.lang !== shown.lang && n.value !== shown.value)
  if (others.length === 0) return ''
  return ` Diğer adları: ${others.map((n) => `${LANG_LABEL[n.lang]}: ${n.value}`).join('; ')}.`
}

function sideNote(side: 'right' | 'left' | undefined): string {
  return side ? ' Bu kayıt tarafa özgüdür; sağ ve sol örnekler ayrı yapılardır.' : ''
}

// ---------------------------------------------------------------------------
// Structure questions (find / name / mcq)
// ---------------------------------------------------------------------------

function structureBase(ctx: Ctx, n: Named, status: ReviewStatus, label: string) {
  const s = n.s
  const names = sourcedNames(s, ctx.index, ctx.lang)
  const side = sideOf(s)
  const opposite = oppositeSideIds(s, ctx.index)
  const accepted = [s.id, ...descendantsOf(s.id, ctx.index)]
  const acceptedSet = new Set(accepted)
  const wrongSide = opposite.flatMap((o) => [o, ...descendantsOf(o, ctx.index)]).filter((x) => !acceptedSet.has(x))
  return {
    origin: 'generated' as const,
    level: s.detailLevel,
    target: s.id,
    explanation: `${label}: ${n.text}.${otherNamesLine(names, n.name)}${sideNote(side)}`,
    sources: dedupeSources([...names.flatMap((x) => x.sources), ...modelSources(s.id, ctx.index)]),
    requiresVisible: [s.id],
    reviewStatus: status,
    systems: [...s.systems],
    regions: [...s.regions],
    acceptedStructureIds: accepted,
    ...(wrongSide.length > 0 ? { wrongSideStructureIds: wrongSide } : {}),
    ...(side ? { side } : {}),
    relatedStructures: [s.id],
  }
}

function buildFind(ctx: Ctx, n: Named, status: ReviewStatus): QuizQuestion {
  return {
    id: `gen:find:${n.s.id}`,
    type: 'find',
    prompt: `Modelde şu yapıyı bulun ve seçin: ${n.text}`,
    answer: { structureId: n.s.id, text: n.text },
    ...structureBase(ctx, n, status, 'Aranan yapı'),
    dependsOn: { structures: [n.s.id], relations: [] },
  }
}

function buildTypedName(ctx: Ctx, n: Named, status: ReviewStatus): QuizQuestion {
  const side = sideOf(n.s)
  return {
    id: `gen:name:${n.s.id}`,
    type: 'name',
    prompt: side
      ? 'İşaretli yapının adını tarafıyla birlikte (sağ/sol) yazın.'
      : 'İşaretli yapının adını yazın (Türkçe, Latince veya İngilizce).',
    highlight: n.s.id,
    acceptedAnswers: allSpellings(n.s),
    answer: { structureId: n.s.id, text: n.text },
    ...structureBase(ctx, n, status, 'İşaretli yapı'),
    dependsOn: { structures: [n.s.id], relations: [] },
  }
}

function buildNameChoice(ctx: Ctx, n: Named, status: ReviewStatus, rng: Rng): QuizQuestion | ExclusionReason {
  const s = n.s
  const side = sideOf(s)
  const blocked = conceptFamily(s.id, ctx.index)
  const pool = namedPool(ctx).filter((c) => !blocked.has(c.s.id))

  // Laterality trap only with an explicit warning in the prompt.
  const opposites = oppositeSideIds(s, ctx.index)
    .map((id) => ctx.index.getStructure(id))
    .filter((x): x is Structure => x !== undefined)
    .map((x) => named(ctx, x))
    .filter((x): x is Named => typeof x !== 'string' && (!ctx.onlyApproved || x.status === 'approved'))
    .filter((x) => x.folded !== n.folded)
  const trap = side !== undefined && opposites.length > 0 && rng() < SIDE_TRAP_PROBABILITY ? opposites[0] : undefined

  const used = new Set([n.folded, ...(trap ? [trap.folded] : [])])
  const score = (c: Named) =>
    (c.name.lang === n.name.lang ? W_LANG : 0) +
    (c.s.kind === s.kind ? W_KIND : 0) +
    (shares(c.s.systems, s.systems) ? W_SYSTEM : 0) +
    (shares(c.s.regions, s.regions) ? W_REGION : 0) +
    (sideOf(c.s) === side ? W_SIDE : 0)
  const picked = pickDistractors(pool, score, trap ? DISTRACTOR_COUNT - 1 : DISTRACTOR_COUNT, used, rng)
  const distractors = trap ? [trap, ...picked] : picked
  if (distractors.length < MIN_DISTRACTORS) return 'insufficient_distractors'

  const ordered = shuffle([n, ...distractors], rng)
  const options = toOptions(ordered)
  const correct = options[ordered.indexOf(n)] as QuizOption
  const base = structureBase(ctx, n, status, 'İşaretli yapı')
  return {
    id: `gen:mcq:${s.id}`,
    type: 'mcq',
    prompt: trap
      ? 'İşaretli yapı aşağıdakilerden hangisidir? Dikkat: aynı yapının sağ ve sol örnekleri ayrı seçenekler olarak verilmiştir.'
      : 'İşaretli yapı aşağıdakilerden hangisidir?',
    highlight: s.id,
    options,
    answer: { optionId: correct.id, structureId: s.id, text: n.text },
    ...base,
    sources: dedupeSources([...base.sources, ...distractors.flatMap((d) => d.name.sources)]),
    reviewStatus: weakestStatus([status, ...distractors.map((d) => d.status)]),
    dependsOn: { structures: [s.id, ...distractors.map((d) => d.s.id)], relations: [] },
  }
}

function structureCandidates(ctx: Ctx, types: ReadonlySet<QuestionType>): Candidate[] {
  const want3D = types.has('find') || types.has('name') || types.has('mcq')
  if (!want3D) return []
  const out: Candidate[] = []
  for (const s of ctx.index.bundle.structures) {
    if (!inScope(ctx, s)) {
      if (ctx.regions && s.regions.length === 0 && matchesSystems(ctx, s.systems)) exclude(ctx, 'region_unassigned', s.id)
      continue
    }
    const n = named(ctx, s)
    if (typeof n === 'string') {
      exclude(ctx, n, s.id)
      continue
    }
    const issue = modelIssue(ctx, s.id)
    if (issue) {
      exclude(ctx, issue, s.id)
      continue
    }
    const status = weakestStatus([n.status, geometryStatus(s.id, ctx.index)])
    if (ctx.onlyApproved && status !== 'approved') {
      exclude(ctx, 'not_approved', s.id)
      continue
    }
    if (types.has('find')) out.push({ id: `gen:find:${s.id}`, type: 'find', subject: s.id, build: () => buildFind(ctx, n, status) })
    if (types.has('name')) out.push({ id: `gen:name:${s.id}`, type: 'name', subject: s.id, build: () => buildTypedName(ctx, n, status) })
    if (types.has('mcq')) out.push({ id: `gen:mcq:${s.id}`, type: 'mcq', subject: s.id, build: (rng) => buildNameChoice(ctx, n, status, rng) })
  }
  return out
}

// ---------------------------------------------------------------------------
// Relation questions
// ---------------------------------------------------------------------------

type Direction = 'forward' | 'inverse'

function buildRelation(
  ctx: Ctx,
  r: Relation,
  dir: Direction,
  subject: Named,
  answer: Named,
  relSources: SourceRef[],
  status: ReviewStatus,
  rng: Rng,
): QuizQuestion | ExclusionReason {
  const index = ctx.index
  const type = r.type
  const symmetric = SYMMETRIC_RELATIONS.has(type)
  const views = index.relationsOf(subject.s.id, [type])

  // Never offer a structure that could also be a correct answer.
  const blocked = conceptFamily(subject.s.id, index)
  for (const id of [answer.s.id, ...views.map((v) => v.otherId)]) {
    for (const x of conceptFamily(id, index)) blocked.add(x)
  }

  const pool = namedPool(ctx).filter((c) => !blocked.has(c.s.id))
  // Spatial relations: prefer distractors from other regions (fewer accidental true answers).
  const regionScore = (c: Named) =>
    SPATIAL_RELATIONS.has(type)
      ? shares(c.s.regions, subject.s.regions)
        ? 0
        : W_REGION
      : shares(c.s.regions, answer.s.regions)
        ? W_REGION
        : 0
  const score = (c: Named) =>
    (c.name.lang === answer.name.lang ? W_LANG : 0) +
    (c.s.kind === answer.s.kind ? W_KIND : 0) +
    (shares(c.s.systems, answer.s.systems) ? W_SYSTEM : 0) +
    regionScore(c) +
    (sideOf(c.s) === sideOf(answer.s) ? W_SIDE : 0)
  const used = new Set([answer.folded, subject.folded])
  const distractors = pickDistractors(pool, score, DISTRACTOR_COUNT, used, rng)
  if (distractors.length < MIN_DISTRACTORS) return 'insufficient_distractors'

  const ordered = shuffle([answer, ...distractors], rng)
  const options = toOptions(ordered)
  const correct = options[ordered.indexOf(answer)] as QuizOption

  const fromN = dir === 'forward' ? subject : answer
  const toN = dir === 'forward' ? answer : subject
  // Other sourced answers of the same question (e.g. a second recorded nerve), for transparency.
  const otherAnswers: string[] = []
  for (const v of views) {
    if (v.relation.id === r.id || v.relation.isVariant || v.relation.review === 'needs_revision') continue
    if (!symmetric && v.direction !== dir) continue
    if (citableSources(v.relation.sources, index).length === 0) continue
    if (ctx.onlyApproved && relationStatus(v.relation) !== 'approved') continue
    const other = index.getStructure(v.otherId)
    const on = other ? named(ctx, other) : undefined
    if (!on || typeof on === 'string' || (ctx.onlyApproved && on.status !== 'approved')) continue
    if (!otherAnswers.includes(on.text)) otherAnswers.push(on.text)
  }
  let explanation = `Kayıtlı ilişki: ${RELATION_FACTS[type](fromN.text, toN.text)}`
  if (otherAnswers.length > 0) explanation += ` Aynı ilişki türünde kayıtlı diğer yapılar: ${otherAnswers.join(', ')}.`
  if (r.qualifier) explanation += ` Kayıttaki nitelendirme: ${r.qualifier}.`
  if (r.note) explanation += ` Not: ${r.note}`

  const subjectRelatives = partOfRelatives(subject.s.id, index)
  const accepted = [answer.s.id, ...descendantsOf(answer.s.id, index).filter((x) => !subjectRelatives.has(x))]
  return {
    id: `gen:rel:${r.id}:${dir}`,
    type: 'relation',
    origin: 'generated',
    level: maxLevel([subject.s.detailLevel, answer.s.detailLevel]),
    prompt: RELATION_PROMPTS[type][dir](subject.text),
    target: subject.s.id,
    options,
    answer: { optionId: correct.id, structureId: answer.s.id, text: answer.text },
    explanation,
    sources: dedupeSources([
      ...relSources,
      ...subject.name.sources,
      ...answer.name.sources,
      ...distractors.flatMap((d) => d.name.sources),
    ]),
    requiresVisible: [],
    reviewStatus: weakestStatus([status, ...distractors.map((d) => d.status)]),
    systems: [...subject.s.systems],
    regions: [...subject.s.regions],
    acceptedStructureIds: accepted,
    relatedStructures: [subject.s.id, answer.s.id],
    dependsOn: { structures: [subject.s.id, answer.s.id, ...distractors.map((d) => d.s.id)], relations: [r.id] },
  }
}

function relationCandidates(ctx: Ctx): Candidate[] {
  const out: Candidate[] = []
  const seenPrompts = new Set<string>()
  for (const r of ctx.index.bundle.relations) {
    const from = ctx.index.getStructure(r.from)
    const to = ctx.index.getStructure(r.to)
    if (!from || !to) {
      exclude(ctx, 'missing_structure', r.id)
      continue
    }
    for (const dir of ['forward', 'inverse'] as const) {
      const subjectS = dir === 'forward' ? from : to
      const answerS = dir === 'forward' ? to : from
      if (!inScope(ctx, subjectS) || LEVEL_RANK[answerS.detailLevel] > ctx.maxLevelRank) continue
      if (r.isVariant) {
        exclude(ctx, 'variant', r.id)
        continue
      }
      if (r.review === 'needs_revision') {
        exclude(ctx, 'needs_revision', r.id)
        continue
      }
      const relSources = citableSources(r.sources, ctx.index)
      if (relSources.length === 0) {
        exclude(ctx, 'unsourced_relation', r.id)
        continue
      }
      const subject = named(ctx, subjectS)
      if (typeof subject === 'string') {
        exclude(ctx, subject, subjectS.id)
        continue
      }
      const answer = named(ctx, answerS)
      if (typeof answer === 'string') {
        exclude(ctx, answer, answerS.id)
        continue
      }
      const status = weakestStatus([relationStatus(r), subject.status, answer.status])
      if (ctx.onlyApproved && status !== 'approved') {
        exclude(ctx, 'not_approved', r.id)
        continue
      }
      const promptKey = SYMMETRIC_RELATIONS.has(r.type) ? `${subjectS.id}|${r.type}` : `${subjectS.id}|${r.type}|${dir}`
      if (seenPrompts.has(promptKey)) continue
      seenPrompts.add(promptKey)
      out.push({
        id: `gen:rel:${r.id}:${dir}`,
        type: 'relation',
        subject: subjectS.id,
        build: (rng) => buildRelation(ctx, r, dir, subject, answer, relSources, status, rng),
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Authored questions
// ---------------------------------------------------------------------------

function authoredCandidates(ctx: Ctx, types: ReadonlySet<QuestionType>): Candidate[] {
  const index = ctx.index
  const out: Candidate[] = []
  for (const q of index.bundle.questions) {
    if (!types.has(q.type)) continue
    // In "Adını söyle" mode an authored multiple-choice question must point at a shown structure.
    if (ctx.config.mode === 'name' && q.type === 'mcq' && !(q.target && q.requiresVisible.includes(q.target))) continue
    const target = q.target ? index.getStructure(q.target) : undefined
    if (q.target && !target) {
      exclude(ctx, 'missing_structure', q.id)
      continue
    }
    const systems = q.systems.length > 0 ? q.systems : (target?.systems ?? [])
    const regions = q.regions.length > 0 ? q.regions : (target?.regions ?? [])
    if (!matchesSystems(ctx, systems) || LEVEL_RANK[q.level] > ctx.maxLevelRank) continue
    if (!matchesRegions(ctx, regions)) {
      if (regions.length === 0) exclude(ctx, 'region_unassigned', q.id)
      continue
    }
    if (target && !ctx.modules.has(target.module)) {
      exclude(ctx, 'module', q.id)
      continue
    }
    if (q.review === 'needs_revision') {
      exclude(ctx, 'needs_revision', q.id)
      continue
    }
    const sources = citableSources(q.sources, index)
    if (sources.length === 0) {
      exclude(ctx, 'unsourced_authored', q.id)
      continue
    }
    const visible = [
      ...new Set([...q.requiresVisible, ...((q.type === 'find' || q.type === 'name') && q.target ? [q.target] : [])]),
    ]
    let issue: ExclusionReason | null = null
    for (const v of visible) {
      const i = modelIssue(ctx, v)
      if (i) {
        issue = i === 'no_model' ? 'unanswerable_authored' : i
        break
      }
    }
    if (!issue && q.type === 'name' && !q.answer.text && !target) issue = 'unanswerable_authored'
    if (!issue && q.type === 'find' && !q.answer.structureId && !q.target) issue = 'unanswerable_authored'
    if (issue) {
      exclude(ctx, issue, q.id)
      continue
    }
    // Without an authored answer text, feedback names the answer structure by its sourced name.
    const answerId = q.answer.structureId ?? (q.type === 'find' ? q.target : undefined)
    const answerS = !q.answer.text && answerId ? index.getStructure(answerId) : undefined
    const derived = answerS ? named(ctx, answerS) : undefined
    const answerName = derived && typeof derived !== 'string' ? derived : undefined
    const status = weakestStatus([
      q.review,
      ...visible.map((v) => geometryStatus(v, index)),
      ...(answerName ? [answerName.status] : []),
    ])
    if (ctx.onlyApproved && status !== 'approved') {
      exclude(ctx, 'not_approved', q.id)
      continue
    }
    const allSources = dedupeSources([...sources, ...(answerName ? answerName.name.sources : [])])
    out.push({
      id: q.id,
      type: q.type,
      subject: q.target,
      build: () => convertAuthored(ctx, q, { target, visible, sources: allSources, status, systems, regions, answerName }),
    })
  }
  return out
}

interface AuthoredContext {
  target: Structure | undefined
  visible: StructureId[]
  sources: SourceRef[]
  status: ReviewStatus
  systems: SystemId[]
  regions: string[]
  answerName: Named | undefined
}

function convertAuthored(ctx: Ctx, q: Question, a: AuthoredContext): QuizQuestion {
  const index = ctx.index
  const { target, visible, sources, status, systems, regions, answerName } = a
  const answerId = q.answer.structureId ?? (q.type === 'find' ? q.target : undefined)
  const answerS = answerId ? index.getStructure(answerId) : undefined
  const accepted = answerId ? [answerId, ...descendantsOf(answerId, index)] : undefined
  const wrongSide = answerS
    ? oppositeSideIds(answerS, index)
        .flatMap((o) => [o, ...descendantsOf(o, index)])
        .filter((x) => !accepted?.includes(x))
    : []
  const highlight =
    q.target && (q.type === 'name' || (q.type === 'mcq' && q.requiresVisible.includes(q.target))) ? q.target : undefined
  const acceptedAnswers =
    q.type === 'name'
      ? [...new Set([...(q.answer.text ? [q.answer.text] : []), ...(target ? allSpellings(target) : [])])]
      : q.answer.text
        ? [q.answer.text]
        : undefined
  // Authored answers state the side themselves when it matters.
  const side = q.type === 'name' && target && q.answer.text && nameStatesSide(q.answer.text) ? sideOf(target) : undefined
  const related = [...new Set([q.target, answerId, ...q.requiresVisible].filter((x): x is StructureId => !!x))]
  return {
    id: q.id,
    type: q.type,
    origin: 'authored',
    level: q.level,
    prompt: q.prompt,
    ...(q.target ? { target: q.target } : {}),
    ...(highlight ? { highlight } : {}),
    ...(q.options ? { options: q.options.map((o) => ({ ...o })) } : {}),
    ...(acceptedAnswers && acceptedAnswers.length > 0 ? { acceptedAnswers } : {}),
    answer: {
      ...q.answer,
      ...(answerId && !q.answer.structureId ? { structureId: answerId } : {}),
      ...(answerName ? { text: answerName.text } : {}),
    },
    explanation: q.explanation,
    sources,
    requiresVisible: visible,
    reviewStatus: status,
    systems: [...systems],
    regions: [...regions],
    ...(accepted ? { acceptedStructureIds: accepted } : {}),
    ...(wrongSide.length > 0 ? { wrongSideStructureIds: wrongSide } : {}),
    ...(side ? { side } : {}),
    relatedStructures: related,
    dependsOn: { structures: [...new Set([...(q.target ? [q.target] : []), ...visible])], relations: [], question: q.id },
  }
}

// ---------------------------------------------------------------------------
// Review queue (spaced repetition + previous mistakes)
// ---------------------------------------------------------------------------

export type ReviewTier = 'due' | 'mistake' | 'viewed' | 'scheduled'

export interface ReviewItem {
  structureId: StructureId
  tier: ReviewTier
  dueAt?: string
}

const TIER_ORDER: Record<ReviewTier, number> = { due: 0, mistake: 1, viewed: 2, scheduled: 3 }

const time = (iso: string | undefined, fallback: number) => {
  const t = iso ? Date.parse(iso) : Number.NaN
  return Number.isNaN(t) ? fallback : t
}

/**
 * Study order for "Tekrar": due spaced-repetition items first (most overdue first), then
 * structures answered wrongly last time (most recent first), then structures only viewed so far,
 * then everything else by next due date.
 */
export function reviewQueue(progress: readonly Progress[], now: Date): ReviewItem[] {
  const nowMs = now.getTime()
  const items = progress.map((p) => {
    const due = p.srs ? time(p.srs.dueAt, Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY
    let tier: ReviewTier
    let key: number
    if (due <= nowMs) {
      tier = 'due'
      key = due
    } else if (p.lastResult === 'incorrect') {
      tier = 'mistake'
      key = -time(p.lastAnsweredAt, 0)
    } else if (p.attempts === 0 && p.viewCount > 0) {
      tier = 'viewed'
      key = -time(p.lastViewedAt, 0)
    } else {
      tier = 'scheduled'
      key = due
    }
    return { item: { structureId: p.structureId, tier, ...(p.srs ? { dueAt: p.srs.dueAt } : {}) }, key }
  })
  items.sort(
    (a, b) =>
      TIER_ORDER[a.item.tier] - TIER_ORDER[b.item.tier] ||
      (a.key === b.key ? 0 : a.key < b.key ? -1 : 1) ||
      a.item.structureId.localeCompare(b.item.structureId),
  )
  return items.map((x) => x.item)
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

interface Selection {
  questions: QuizQuestion[]
  usedSubjects: Set<StructureId>
  usedIds: Set<string>
}

function tryAdd(ctx: Ctx, sel: Selection, c: Candidate, rng: Rng): boolean {
  if (sel.usedIds.has(c.id)) return false
  sel.usedIds.add(c.id)
  const built = c.build(rng)
  if (typeof built === 'string') {
    exclude(ctx, built, c.id)
    return false
  }
  sel.questions.push(built)
  if (c.subject) sel.usedSubjects.add(c.subject)
  return true
}

/** Round-robin over question types; first pass avoids asking about the same structure twice. */
function selectBalanced(ctx: Ctx, candidates: Candidate[], count: number, rng: Rng): Selection {
  const sel: Selection = { questions: [], usedSubjects: new Set(), usedIds: new Set() }
  const byType = new Map<QuestionType, Candidate[]>()
  for (const c of candidates) {
    const list = byType.get(c.type)
    if (list) list.push(c)
    else byType.set(c.type, [c])
  }
  const types = shuffle([...byType.keys()], rng)
  const queues = new Map(types.map((t) => [t, shuffle(byType.get(t) ?? [], rng)]))
  const deferred = new Map<QuestionType, Candidate[]>(types.map((t) => [t, []]))

  // Pass 1: distinct subjects.
  let progressed = true
  while (sel.questions.length < count && progressed) {
    progressed = false
    for (const t of types) {
      if (sel.questions.length >= count) break
      const queue = queues.get(t) as Candidate[]
      while (queue.length > 0) {
        const c = queue.shift() as Candidate
        if (c.subject && sel.usedSubjects.has(c.subject)) {
          deferred.get(t)?.push(c)
          continue
        }
        if (tryAdd(ctx, sel, c, rng)) {
          progressed = true
          break
        }
      }
    }
  }
  // Pass 2: allow another question type about an already used structure.
  progressed = true
  while (sel.questions.length < count && progressed) {
    progressed = false
    for (const t of types) {
      if (sel.questions.length >= count) break
      const queue = deferred.get(t) as Candidate[]
      while (queue.length > 0) {
        if (tryAdd(ctx, sel, queue.shift() as Candidate, rng)) {
          progressed = true
          break
        }
      }
    }
  }
  sel.questions = shuffle(sel.questions, rng)
  return sel
}

/** Review: follow the review queue order, one question per structure first. */
function selectReview(
  ctx: Ctx,
  candidates: Candidate[],
  queue: readonly ReviewItem[],
  count: number,
  rng: Rng,
): Selection & { coveredStructures: number } {
  const sel: Selection = { questions: [], usedSubjects: new Set(), usedIds: new Set() }
  const bySubject = new Map<StructureId, Candidate[]>()
  for (const c of candidates) {
    if (!c.subject) continue
    const list = bySubject.get(c.subject)
    if (list) list.push(c)
    else bySubject.set(c.subject, [c])
  }
  const covered = new Set<StructureId>()
  for (let pass = 0; pass < 2 && sel.questions.length < count; pass++) {
    for (const item of queue) {
      if (sel.questions.length >= count) break
      if (pass === 0 && sel.usedSubjects.has(item.structureId)) continue
      let options = (bySubject.get(item.structureId) ?? []).filter((c) => !sel.usedIds.has(c.id))
      while (options.length > 0) {
        const c = pick(options, rng) as Candidate
        options = options.filter((x) => x !== c)
        if (tryAdd(ctx, sel, c, rng)) {
          covered.add(item.structureId)
          break
        }
      }
    }
  }
  return { ...sel, coveredStructures: covered.size }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateQuiz(
  index: ContentIndex,
  config: QuizConfig,
  ctxIn: { progress?: Progress[]; now?: Date } = {},
): GenerationReport {
  const requested = config.count
  if (!Number.isInteger(requested) || requested <= 0) {
    return { questions: [], shortfallReasons: ['Soru sayısı en az 1 olan bir tam sayı olmalıdır.'], exclusions: [] }
  }

  const modeTypes = MODE_QUESTION_TYPES[config.mode]
  const types = new Set(config.types ? modeTypes.filter((t) => config.types?.includes(t)) : modeTypes)
  if (types.size === 0) {
    return {
      questions: [],
      shortfallReasons: [
        `Seçilen soru türleri bu modla uyumlu değil. Bu modda kullanılabilen türler: ${modeTypes.map((t) => TYPE_LABEL[t]).join(', ')}.`,
      ],
      exclusions: [],
    }
  }

  const ctx: Ctx = {
    index,
    config,
    lang: config.lang ?? 'tr',
    onlyApproved: config.onlyApproved ?? false,
    allowSchematic: config.allowSchematicModels ?? false,
    modules: new Set(config.modules ?? ['core']),
    maxLevelRank: LEVEL_RANK[config.level ?? 'advanced'],
    systems: config.systems && config.systems.length > 0 ? new Set(config.systems) : null,
    regions: config.regions && config.regions.length > 0 ? regionClosure(index, config.regions) : null,
    excluded: new Map(),
    namedCache: new Map(),
    namedPool: null,
  }
  const rng = createRng(config.seed, 'quiz', config.mode)

  const candidates = [
    ...structureCandidates(ctx, types),
    ...(types.has('relation') ? relationCandidates(ctx) : []),
    ...authoredCandidates(ctx, types),
  ]

  const reasons: string[] = []
  let questions: QuizQuestion[]
  if (config.mode === 'review') {
    const queue = reviewQueue(ctxIn.progress ?? [], ctxIn.now ?? new Date())
    const sel = selectReview(ctx, candidates, queue, requested, rng)
    questions = sel.questions
    if (questions.length < requested) {
      if (queue.length === 0) {
        reasons.push('Tekrar için kayıtlı çalışma geçmişi yok. Önce yapıları inceleyin veya birkaç soru çözün.')
      } else {
        reasons.push(
          `Tekrar yalnızca daha önce incelenen veya cevaplanan yapılarla yapılır: çalışma geçmişindeki ${queue.length} yapıdan ${sel.coveredStructures} tanesi için uygun soru bulunabildi.`,
        )
      }
    }
  } else {
    questions = selectBalanced(ctx, candidates, requested, rng).questions
  }

  const exclusions: GenerationExclusion[] = REASON_ORDER.filter((r) => (ctx.excluded.get(r)?.size ?? 0) > 0).map((r) => {
    const count = ctx.excluded.get(r)?.size ?? 0
    return { reason: r, count, message: EXCLUSION_MESSAGES[r](count) }
  })

  const short = questions.length < requested
  const shortfallReasons: string[] = []
  if (short) {
    shortfallReasons.push(
      questions.length === 0
        ? `İstenen ${requested} sorudan hiçbiri üretilemedi.`
        : `İstenen ${requested} sorudan yalnızca ${questions.length} tanesi üretilebildi.`,
    )
    shortfallReasons.push(...reasons)
    if (config.mode !== 'review') {
      shortfallReasons.push(
        `Seçilen ayarlara (sistem, bölge, ayrıntı düzeyi, soru türü) uyan kullanılabilir soru adayı sayısı: ${candidates.length}.`,
      )
    }
    if (types.has('section')) {
      shortfallReasons.push(
        'Kesit tanıma soruları otomatik üretilmez; yalnızca hazırlanmış ve kaynak gösteren kesit soruları kullanılır.',
      )
    }
    shortfallReasons.push(...exclusions.map((e) => e.message))
  } else {
    shortfallReasons.push(...exclusions.filter((e) => ALWAYS_REPORTED.has(e.reason)).map((e) => e.message))
  }

  return { questions, shortfallReasons, exclusions }
}
