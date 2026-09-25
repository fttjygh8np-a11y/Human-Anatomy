/**
 * Search contract (implemented in src/search/searchIndex.ts with MiniSearch).
 * Handles Turkish characters (İ/ı, ş, ğ, ç, ö, ü), diacritic-insensitive matching,
 * synonyms and small typos, across Turkish, Latin and English names.
 */
import type { Lang, Laterality, StructureId, SystemId } from '../core/schema.ts'

export interface SearchHit {
  id: StructureId
  score: number
  /** Which name matched best. */
  matchedLang: Lang
  matchedKind: 'name' | 'synonym'
  matchedText: string
  /** For display without another lookup. */
  nameTr: string | null
  nameLa: string | null
  nameEn: string
  systems: SystemId[]
  regions: string[]
  laterality: Laterality
  hasModel: boolean
}

export interface SearchOptions {
  limit?: number
  systems?: SystemId[]
  regions?: string[]
  laterality?: Laterality[]
  /** Only structures that have a 3D model. */
  withModelOnly?: boolean
}

export interface SearchService {
  search(query: string, opts?: SearchOptions): SearchHit[]
  /** Autocomplete suggestions (prefix-oriented). */
  suggest(query: string, limit?: number): SearchHit[]
  /**
   * How a query is understood (normalized terms, side words turned into a laterality
   * filter). Lets the UI show e.g. "Sol taraf filtresi uygulandı". Optional for mocks.
   */
  parseQuery?(query: string): ParsedQuery
}

export interface ParsedQuery {
  /** Normalized search terms (side words removed). */
  terms: string[]
  /**
   * Laterality implied by side words in the query ("sol"/"left"/"sinister",
   * "sağ"/"right"/"dexter", ...); null when the query names no side, or when the
   * side word is the whole query (then it is searched as text).
   */
  laterality: Array<'left' | 'right'> | null
  /** Normalized side words that were removed from the text. */
  sideTerms: string[]
}
