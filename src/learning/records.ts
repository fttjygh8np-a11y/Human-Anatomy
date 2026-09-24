/**
 * Record-level helpers shared by the question generator and the scene planners:
 * sourced names, laterality display, review-status arithmetic, part-of relatives and
 * source collection. Nothing here invents content: a name is only used when it cites a
 * source that exists in the bundle.
 */
import type {
  DetailLevel,
  NameEntry,
  Relation,
  ReviewStatus,
  SourceRef,
  Structure,
  StructureId,
} from '../core/schema.ts'
import type { ContentIndex } from '../data/types.ts'
import { nameStatesSide, type Side } from './normalize.ts'
import type { NameLang } from './types.ts'

// ---------------------------------------------------------------------------
// Review status arithmetic
// ---------------------------------------------------------------------------

/**
 * Trust order used for "weakest status": a record flagged as needing revision is the
 * least trustworthy, then draft, then the review pipeline in order, then approved.
 */
export const STATUS_RANK: Record<ReviewStatus, number> = {
  needs_revision: 0,
  draft: 1,
  source_check_pending: 2,
  expert_review_pending: 3,
  approved: 4,
}

export function weakestStatus(statuses: readonly ReviewStatus[]): ReviewStatus {
  let out: ReviewStatus = 'approved'
  for (const s of statuses) if (STATUS_RANK[s] < STATUS_RANK[out]) out = s
  return out
}

/**
 * Field-level verification caps the workflow status: an unverified value cannot be further
 * along than "source check pending"; a source-checked value cannot be "approved" until an
 * expert approved it.
 */
export const VERIFICATION_CAP: Record<'unverified' | 'source_checked' | 'expert_approved', ReviewStatus> = {
  unverified: 'source_check_pending',
  source_checked: 'expert_review_pending',
  expert_approved: 'approved',
}

/** Effective status of a relation record (workflow status capped by its verification). */
export function relationStatus(r: Relation): ReviewStatus {
  return weakestStatus([r.review, VERIFICATION_CAP[r.verification]])
}

/** Status of a displayed name: the structure's label review, capped when the entry is unverified. */
export function nameStatus(s: Structure, entry: NameEntry): ReviewStatus {
  return weakestStatus([s.review.labels, entry.status === 'verified' ? 'approved' : 'source_check_pending'])
}

/** Geometry status of a structure: its own geometry review and that of every asset showing it. */
export function geometryStatus(id: StructureId, index: ContentIndex): ReviewStatus {
  const s = index.getStructure(id)
  const statuses: ReviewStatus[] = [s?.review.geometry ?? 'draft']
  for (const assetId of index.assetsFor(id)) {
    statuses.push(index.getAsset(assetId)?.review.geometry ?? 'draft')
  }
  return weakestStatus(statuses)
}

// ---------------------------------------------------------------------------
// Detail levels (basic ⊂ intermediate ⊂ advanced)
// ---------------------------------------------------------------------------

export const LEVEL_RANK: Record<DetailLevel, number> = { basic: 0, intermediate: 1, advanced: 2 }

export function maxLevel(levels: readonly DetailLevel[]): DetailLevel {
  let out: DetailLevel = 'basic'
  for (const l of levels) if (LEVEL_RANK[l] > LEVEL_RANK[out]) out = l
  return out
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Source refs whose source record exists in the bundle (dangling refs are not citable). */
export function citableSources(refs: readonly SourceRef[] | undefined, index: ContentIndex): SourceRef[] {
  return (refs ?? []).filter((r) => index.getSource(r.sourceId) !== undefined)
}

export function dedupeSources(refs: readonly SourceRef[]): SourceRef[] {
  const seen = new Set<string>()
  const out: SourceRef[] = []
  for (const r of refs) {
    const key = `${r.sourceId}\u0000${r.locator ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

/** Citations of the 3D model assets that represent a structure (geometry/label mapping). */
export function modelSources(id: StructureId, index: ContentIndex): SourceRef[] {
  const out: SourceRef[] = []
  for (const assetId of index.assetsFor(id)) {
    const asset = index.getAsset(assetId)
    if (!asset || !index.getSource(asset.sourceId)) continue
    out.push({ sourceId: asset.sourceId, note: `3B model: ${asset.label.tr}` })
  }
  return out
}

/** Whether every asset representing the structure is schematic placeholder geometry. */
export function onlySchematicModel(id: StructureId, index: ContentIndex): boolean {
  const assets = index.assetsFor(id)
  if (assets.length === 0) return false
  return assets.every((a) => index.getAsset(a)?.representation === 'schematic')
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export interface SourcedName {
  lang: NameLang
  value: string
  entry: NameEntry
  /** Citable sources of the name entry (non-empty). */
  sources: SourceRef[]
}

const LANG_ORDER: Record<NameLang, NameLang[]> = {
  tr: ['tr', 'la', 'en'],
  la: ['la', 'tr', 'en'],
  en: ['en', 'tr', 'la'],
}

/** All names of a structure that cite at least one existing source, in preference order. */
export function sourcedNames(s: Structure, index: ContentIndex, prefer: NameLang = 'tr'): SourcedName[] {
  const out: SourcedName[] = []
  for (const lang of LANG_ORDER[prefer]) {
    const entry = s.names[lang]
    if (!entry) continue
    const sources = citableSources(entry.sources, index)
    if (sources.length === 0) continue
    out.push({ lang, value: entry.value, entry, sources })
  }
  return out
}

/** Best sourced name for display (preferred language first), or undefined when no name is sourced. */
export function displayName(s: Structure, index: ContentIndex, prefer: NameLang = 'tr'): SourcedName | undefined {
  return sourcedNames(s, index, prefer)[0]
}

/** Every spelling a learner may type: all names and synonyms of the record. */
export function allSpellings(s: Structure): string[] {
  const out = [s.names.tr?.value, s.names.la?.value, s.names.en.value, ...s.synonyms.map((x) => x.value)]
  return [...new Set(out.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))]
}

// ---------------------------------------------------------------------------
// Laterality
// ---------------------------------------------------------------------------

export function sideOf(s: Structure): Side | undefined {
  return s.laterality === 'right' || s.laterality === 'left' ? s.laterality : undefined
}

export const SIDE_TR: Record<Side, string> = { right: 'sağ', left: 'sol' }

/** Name with its side made explicit ("X (sağ)") unless the name already states a side. */
export function withSide(name: string, side: Side | undefined): string {
  if (!side || nameStatesSide(name)) return name
  return `${name} (${SIDE_TR[side]})`
}

// ---------------------------------------------------------------------------
// Part-of relatives
// ---------------------------------------------------------------------------

export function descendantsOf(id: StructureId, index: ContentIndex): StructureId[] {
  const out: StructureId[] = []
  const seen = new Set<StructureId>([id])
  const stack = [id]
  while (stack.length > 0) {
    const cur = stack.pop() as StructureId
    for (const c of index.childrenOf(cur)) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c.id)
      stack.push(c.id)
    }
  }
  return out
}

/** The structure, its part-of ancestors and descendants. */
export function partOfRelatives(id: StructureId, index: ContentIndex): Set<StructureId> {
  return new Set([id, ...index.ancestorsOf(id), ...descendantsOf(id, index)])
}

const byGenericCache = new WeakMap<ContentIndex, Map<StructureId, Structure[]>>()

/** Sided instances grouped by their side-independent concept (cached per index). */
function instancesByGeneric(index: ContentIndex): Map<StructureId, Structure[]> {
  let map = byGenericCache.get(index)
  if (!map) {
    map = new Map()
    for (const s of index.bundle.structures) {
      if (!s.genericId) continue
      const list = map.get(s.genericId)
      if (list) list.push(s)
      else map.set(s.genericId, [s])
    }
    byGenericCache.set(index, map)
  }
  return map
}

/** Opposite-side instance(s) of a sided structure: explicit counterpart and siblings under the same generic. */
export function oppositeSideIds(s: Structure, index: ContentIndex): StructureId[] {
  const side = sideOf(s)
  if (!side) return []
  const out = new Set<StructureId>()
  if (s.counterpartId && index.getStructure(s.counterpartId)) out.add(s.counterpartId)
  if (s.genericId) {
    for (const other of instancesByGeneric(index).get(s.genericId) ?? []) {
      const otherSide = sideOf(other)
      if (other.id !== s.id && otherSide && otherSide !== side) out.add(other.id)
    }
  }
  return [...out]
}

/**
 * Everything that would make a "wrong" option partially right: the structure's part-of
 * relatives, the same concept on either side (generic, counterpart) of any of them, and the
 * parts of those. Used to keep such records out of distractors.
 */
export function conceptFamily(id: StructureId, index: ContentIndex): Set<StructureId> {
  const out = partOfRelatives(id, index)
  for (const r of [...out]) {
    const s = index.getStructure(r)
    if (!s) continue
    for (const c of sameConceptIds(s, index)) {
      out.add(c)
      for (const d of descendantsOf(c, index)) out.add(d)
    }
  }
  return out
}

/** Structures that name the same concept on either side (generic, counterpart, same-generic instances). */
export function sameConceptIds(s: Structure, index: ContentIndex): StructureId[] {
  const out = new Set<StructureId>(oppositeSideIds(s, index))
  if (s.genericId) {
    out.add(s.genericId)
    for (const other of instancesByGeneric(index).get(s.genericId) ?? []) out.add(other.id)
  }
  for (const inst of instancesByGeneric(index).get(s.id) ?? []) out.add(inst.id)
  out.delete(s.id)
  return [...out]
}
