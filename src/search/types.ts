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
}
