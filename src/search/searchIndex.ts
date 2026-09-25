/**
 * Structure search (see SearchService in ./types.ts).
 *
 * MiniSearch provides candidate retrieval (exact + prefix + small-typo fuzzy terms over
 * Turkish, Latin and English names and synonyms). Candidates are then re-scored per
 * name entry so that the result can report *which* name matched and so that the ranking
 * is predictable:
 *
 *   exact term (1.0) > prefix (0.6–0.8) > typo (0.4 / 0.25)   (averaged over query terms)
 *   + bonus when the whole name equals the query, when all of its words matched, or
 *     when it starts with the query; small bonus for names with fewer unmatched words
 *   × 1.0 for names, 0.8 for synonyms  × 1.1 for Turkish, 1.0 for Latin/English
 *
 * Side words in the query ("sol", "left", "sinister", "sağ", "right", "dexter", ...) are
 * removed from the text and act as a laterality filter. A structure passes that filter
 * when its laterality is the requested side or when one of its names contains a word of
 * the same side (e.g. "Arteria coronaria dextra", which is not a sided instance). If no
 * sided instance matches, side-independent concepts (`paired_generic`) are returned
 * instead, so "sol femur" still finds the femur concept when no left instance exists.
 */
import MiniSearch, { type SearchOptions as MiniSearchOptions } from 'minisearch'
import type { Lang, Laterality, Structure, StructureId } from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import { editDistance, maxTypos, phraseKey, sideOfTerm, tokenize } from './normalize.ts'
import type { ParsedQuery, SearchHit, SearchOptions, SearchService } from './types.ts'

export { normalizeSearchText, tokenize } from './normalize.ts'

const DEFAULT_SEARCH_LIMIT = 20
const DEFAULT_SUGGEST_LIMIT = 8

type Side = 'left' | 'right'

const FIELDS = ['nameTr', 'nameLa', 'nameEn', 'synTr', 'synLa', 'synEn'] as const
type Field = (typeof FIELDS)[number]
type IndexedDoc = { id: StructureId } & Record<Field, string>

/** MiniSearch field boosts (candidate retrieval order; final ranking is re-scored below). */
const FIELD_BOOST: Record<Field, number> = {
  nameTr: 1.2,
  nameLa: 1,
  nameEn: 1,
  synTr: 0.85,
  synLa: 0.75,
  synEn: 0.75,
}

const SCORE = {
  exact: 1,
  prefixBase: 0.6,
  prefixSpan: 0.2,
  /** Indexed by edit distance. */
  typo: [1, 0.4, 0.25] as readonly number[],
  /** Whole name equals the query. */
  phraseExactBonus: 0.3,
  /** Every word of the name matched (typos or different word order). */
  phraseCompleteBonus: 0.15,
  /** Name starts with the query (as whole words in search, as text in suggest). */
  phrasePrefixBonus: 0.15,
  /** × share of the name's words matched as whole words. */
  completenessBonus: 0.05,
  kind: { name: 1, synonym: 0.8 },
  lang: { tr: 1.1, la: 1, en: 1 } satisfies Record<Lang, number>,
} as const

interface NameEntry {
  lang: Lang
  kind: 'name' | 'synonym'
  text: string
  terms: string[]
  phrase: string
}

interface Doc {
  structure: Structure
  entries: NameEntry[]
  /** Sides named in any of the structure's names/synonyms. */
  sidesInNames: Set<Side>
}

type Mode = 'search' | 'suggest'

interface Evaluated {
  doc: Doc
  entry: NameEntry
  score: number
  retrievalScore: number
}

export function parseQuery(query: string): ParsedQuery {
  const all = tokenize(query)
  const terms: string[] = []
  const sideTerms: string[] = []
  const sides = new Set<Side>()
  for (const t of all) {
    const side = sideOfTerm(t)
    if (side) {
      sides.add(side)
      sideTerms.push(t)
    } else {
      terms.push(t)
    }
  }
  // A side word alone ("sol") is searched as text rather than turned into a filter.
  if (terms.length === 0) return { terms: all, laterality: null, sideTerms: [] }
  return { terms, laterality: sides.size > 0 ? [...sides] : null, sideTerms }
}

function buildEntries(s: Structure): NameEntry[] {
  const entries: NameEntry[] = []
  const add = (lang: Lang, kind: NameEntry['kind'], text: string | undefined) => {
    if (!text) return
    const terms = tokenize(text)
    if (terms.length === 0) return
    entries.push({ lang, kind, text, terms, phrase: terms.join(' ') })
  }
  add('tr', 'name', s.names.tr?.value)
  add('la', 'name', s.names.la?.value)
  add('en', 'name', s.names.en.value)
  for (const syn of s.synonyms) add(syn.lang, 'synonym', syn.value)
  return entries
}

interface TermMatch {
  score: number
  /** Index of the matched name term. */
  at: number
  /** Whole-word match (exact or typo), as opposed to a prefix of a longer word. */
  whole: boolean
}

function matchTerm(q: string, terms: readonly string[], allowPrefix: boolean, typos: number): TermMatch | null {
  let best: TermMatch | null = null
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i]!
    if (t === q) return { score: SCORE.exact, at: i, whole: true }
    let score = 0
    let whole = false
    if (allowPrefix && t.startsWith(q)) {
      score = SCORE.prefixBase + (SCORE.prefixSpan * q.length) / t.length
    } else if (typos > 0) {
      const d = editDistance(q, t, typos)
      if (d <= typos) {
        score = SCORE.typo[d] ?? 0
        whole = true
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { score, at: i, whole }
  }
  return best
}

export function createSearchService(index: ContentIndex): SearchService {
  const docs = new Map<StructureId, Doc>()
  const indexed: IndexedDoc[] = []
  for (const s of index.bundle.structures) {
    if (docs.has(s.id)) continue
    const entries = buildEntries(s)
    const sidesInNames = new Set<Side>()
    for (const e of entries) {
      for (const t of e.terms) {
        const side = sideOfTerm(t)
        if (side) sidesInNames.add(side)
      }
    }
    docs.set(s.id, { structure: s, entries, sidesInNames })
    const syn = (lang: Lang) =>
      s.synonyms
        .filter((x) => x.lang === lang)
        .map((x) => x.value)
        .join('\n')
    indexed.push({
      id: s.id,
      nameTr: s.names.tr?.value ?? '',
      nameLa: s.names.la?.value ?? '',
      nameEn: s.names.en.value,
      synTr: syn('tr'),
      synLa: syn('la'),
      synEn: syn('en'),
    })
  }

  const mini = new MiniSearch<IndexedDoc>({
    idField: 'id',
    fields: [...FIELDS],
    storeFields: [],
    tokenize: (text) => tokenize(text),
    processTerm: (term) => term || null,
  })
  mini.addAll(indexed)

  // Region hierarchy (for sub-region filtering).
  const regionChildren = new Map<string, string[]>()
  for (const r of index.bundle.regions) {
    if (!r.parentId) continue
    const list = regionChildren.get(r.parentId)
    if (list) list.push(r.id)
    else regionChildren.set(r.parentId, [r.id])
  }
  const expandRegions = (ids: readonly string[]): Set<string> => {
    const out = new Set<string>()
    const stack = [...ids]
    while (stack.length > 0) {
      const id = stack.pop()!
      if (out.has(id)) continue
      out.add(id)
      stack.push(...(regionChildren.get(id) ?? []))
    }
    return out
  }

  const hasModelCache = new Map<StructureId, boolean>()
  const hasModel = (id: StructureId): boolean => {
    let v = hasModelCache.get(id)
    if (v === undefined) {
      v = index.hasModel(id)
      hasModelCache.set(id, v)
    }
    return v
  }

  const allowPrefixFor = (mode: Mode, term: string, i: number, count: number) =>
    mode === 'suggest' || term.length >= 2 || i === count - 1
  const typosFor = (mode: Mode, term: string) =>
    mode === 'suggest' ? (term.length >= 5 ? 1 : 0) : maxTypos(term.length)

  const retrieve = (terms: string[], mode: Mode, combineWith: 'AND' | 'OR') => {
    const options: MiniSearchOptions = {
      combineWith,
      boost: FIELD_BOOST,
      weights: { prefix: 0.6, fuzzy: 0.3 },
      prefix: (term, i, all) => allowPrefixFor(mode, term, i, all.length),
      fuzzy: (term) => typosFor(mode, term) || false,
    }
    return mini.search(terms.join(' '), options)
  }

  /** Best-matching name entry of a candidate, and the share of query terms it matched. */
  const evaluate = (
    doc: Doc,
    terms: string[],
    phrases: string[],
    mode: Mode,
  ): { entry: NameEntry; score: number; coverage: number } | null => {
    const matched = new Array<boolean>(terms.length).fill(false)
    let best: { entry: NameEntry; score: number } | null = null
    for (const entry of doc.entries) {
      let sum = 0
      const covered = new Set<number>()
      terms.forEach((q, i) => {
        const m = matchTerm(q, entry.terms, allowPrefixFor(mode, q, i, terms.length), typosFor(mode, q))
        if (!m) return
        matched[i] = true
        sum += m.score
        if (m.whole) covered.add(m.at)
      })
      if (sum === 0) continue
      // Share of the name's own words matched as whole words: prefers "Humerus" over
      // "Sol humerus" for "humerus" (and for the typo "humreus").
      const completeness = covered.size / entry.terms.length
      let base = sum / terms.length + SCORE.completenessBonus * completeness
      if (phrases.includes(entry.phrase)) base += SCORE.phraseExactBonus
      else if (completeness === 1) base += SCORE.phraseCompleteBonus
      else if (
        phrases.some((p) => (mode === 'suggest' ? entry.phrase.startsWith(p) : entry.phrase.startsWith(`${p} `)))
      )
        base += SCORE.phrasePrefixBonus
      const score = base * SCORE.kind[entry.kind] * SCORE.lang[entry.lang]
      if (!best || score > best.score || (score === best.score && entry.text.length < best.entry.text.length)) {
        best = { entry, score }
      }
    }
    if (!best) return null
    const coverage = matched.filter(Boolean).length / terms.length
    return { ...best, coverage }
  }

  const toHit = (e: Evaluated): SearchHit => {
    const s = e.doc.structure
    return {
      id: s.id,
      score: e.score,
      matchedLang: e.entry.lang,
      matchedKind: e.entry.kind,
      matchedText: e.entry.text,
      nameTr: s.names.tr?.value ?? null,
      nameLa: s.names.la?.value ?? null,
      nameEn: s.names.en.value,
      systems: [...s.systems],
      regions: [...s.regions],
      laterality: s.laterality,
      hasModel: hasModel(s.id),
    }
  }

  const run = (query: string, opts: SearchOptions, mode: Mode, limit: number): SearchHit[] => {
    if (!(limit > 0)) return []
    const parsed = parseQuery(query)
    const { terms } = parsed
    if (terms.length === 0) return []

    const phrases = [terms.join(' ')]
    const fullPhrase = phraseKey(query)
    if (!phrases.includes(fullPhrase)) phrases.push(fullPhrase)

    const systems = opts.systems && opts.systems.length > 0 ? new Set(opts.systems) : null
    const regions = opts.regions && opts.regions.length > 0 ? expandRegions(opts.regions) : null
    const lateralities = opts.laterality && opts.laterality.length > 0 ? new Set<Laterality>(opts.laterality) : null

    const passesStatic = (doc: Doc) => {
      const s = doc.structure
      if (systems && !s.systems.some((x) => systems.has(x))) return false
      if (regions && !s.regions.some((x) => regions.has(x))) return false
      if (lateralities && !lateralities.has(s.laterality)) return false
      if (opts.withModelOnly && !hasModel(s.id)) return false
      return true
    }
    const querySides = parsed.laterality
    const passesSide = (doc: Doc, relaxed: boolean) => {
      if (!querySides) return true
      const lat = doc.structure.laterality
      if (querySides.some((side) => lat === side || doc.sidesInNames.has(side))) return true
      return relaxed && lat === 'paired_generic'
    }

    const retrieved = new Map<'AND' | 'OR', ReturnType<typeof retrieve>>()
    const collect = (combineWith: 'AND' | 'OR', minCoverage: number, relaxed: boolean): Evaluated[] => {
      let candidates = retrieved.get(combineWith)
      if (!candidates) {
        candidates = retrieve(terms, mode, combineWith)
        retrieved.set(combineWith, candidates)
      }
      const out: Evaluated[] = []
      for (const r of candidates) {
        const doc = docs.get(r.id as StructureId)
        if (!doc || !passesStatic(doc) || !passesSide(doc, relaxed)) continue
        const ev = evaluate(doc, terms, phrases, mode)
        if (!ev || ev.coverage < minCoverage) continue
        out.push({ doc, entry: ev.entry, score: ev.score, retrievalScore: r.score })
      }
      return out
    }

    const attempts: Array<[combineWith: 'AND' | 'OR', minCoverage: number]> =
      mode === 'suggest' ? [['AND', 1], ['OR', 0.5]] : [['OR', 0.5]]
    let results: Evaluated[] = []
    for (const relaxed of querySides ? [false, true] : [false]) {
      for (const [combineWith, minCoverage] of attempts) {
        results = collect(combineWith, minCoverage, relaxed)
        if (results.length > 0) break
      }
      if (results.length > 0) break
    }

    results.sort(
      (a, b) =>
        b.score - a.score ||
        b.retrievalScore - a.retrievalScore ||
        a.entry.text.length - b.entry.text.length ||
        (a.doc.structure.id < b.doc.structure.id ? -1 : a.doc.structure.id > b.doc.structure.id ? 1 : 0),
    )
    return results.slice(0, limit).map(toHit)
  }

  return {
    search: (query, opts = {}) => run(query, opts, 'search', opts.limit ?? DEFAULT_SEARCH_LIMIT),
    suggest: (query, limit = DEFAULT_SUGGEST_LIMIT) => run(query, {}, 'suggest', limit),
    parseQuery,
  }
}
