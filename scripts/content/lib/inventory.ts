/**
 * Draft structure inventory from the BodyParts3D element list (pure logic).
 *
 * Input: vendor/bodyparts3d/elements.json written by the model pipeline (scripts/models/**).
 * Expected shape (the reader is tolerant, see ELEMENT_FIELD_ALIASES):
 *
 *   [ { "elementId": "FJ3170",          // BodyParts3D element (mesh) id        — required
 *       "fmaId": "FMA13303",           // FMA concept id ("FMA13303" | "13303") — required
 *       "nameEn": "right humerus",     // BodyParts3D English name              — required
 *       "system": "skeletal",          // SystemId (or common alias)            — required
 *       "chunk": "skeletal/upper_limb",// model chunk "system/region"           — optional
 *       "laterality": "right",         // right|left|midline|unpaired|...       — optional
 *       "regions": ["upper_limb"],     // explicit region ids                   — optional
 *       "kind": "bone" } ]             // StructureKind                         — optional
 *   or { "elements": [ ... ] }
 *
 * Output: draft Structure records (id `fma:<n>`), grouped by primary system. Only facts that
 * come from the element list are recorded: the English BodyParts3D name (status
 * "unverified"), FMA id, element id, system, laterality and chunk-derived region. Turkish and
 * Latin names are never generated here; they are added later, with sources, as overlays.
 */
import {
  LATERALITIES,
  STRUCTURE_KINDS,
  SYSTEM_IDS,
  TOP_REGION_IDS,
  type DetailLevel,
  type Laterality,
  type StructureInput,
  type StructureKind,
  type SystemId,
} from '../../../src/core/schema.ts'
import { lateralityFromEnglishName } from '../../../src/core/frame.ts'
import { warning, type Issue } from './issues.ts'
import { isPlainObject } from './merge.ts'

export const ELEMENTS_FILE = 'vendor/bodyparts3d/elements.json'
export const BP3D_SOURCE_ID = 'src:bodyparts3d'

export const ELEMENT_FIELD_ALIASES = {
  elementId: ['elementId', 'element_id', 'fjId', 'fj', 'id'],
  fmaId: ['fmaId', 'fma_id', 'fmaID', 'fma', 'conceptId'],
  nameEn: ['nameEn', 'name_en', 'nameEN', 'englishName', 'name', 'en'],
  system: ['system', 'systems'],
  chunk: ['chunk'],
  laterality: ['laterality', 'side'],
  regions: ['regions', 'region'],
  kind: ['kind'],
} as const

const SYSTEM_ALIASES: Record<string, SystemId> = {
  skeleton: 'skeletal',
  bone: 'skeletal',
  bones: 'skeletal',
  joint: 'articular',
  joints: 'articular',
  ligament: 'articular',
  ligaments: 'articular',
  muscle: 'muscular',
  muscles: 'muscular',
  muscle_system: 'muscular',
  vascular: 'cardiovascular',
  circulatory: 'cardiovascular',
  vessel: 'cardiovascular',
  vessels: 'cardiovascular',
  lymphoid: 'lymphatic',
  nerve: 'nervous',
  nerves: 'nervous',
  neural: 'nervous',
  respiration: 'respiratory',
  alimentary: 'digestive',
  urogenital: 'urinary',
  genital: 'reproductive',
  sense_organs: 'sensory',
  sense: 'sensory',
  skin: 'integumentary',
  integument: 'integumentary',
}

export interface Bp3dElement {
  elementId: string
  /** Digits only, e.g. "13303". */
  fmaId: string
  nameEn: string
  systems: SystemId[]
  chunk?: string
  laterality?: Laterality
  regions?: string[]
  kind?: StructureKind
}

function pick(obj: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  return undefined
}

export function normalizeFmaId(v: unknown): string | null {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return String(v)
  if (typeof v !== 'string') return null
  const m = /^(?:fma[:_]?)?\s*(\d+)$/i.exec(v.trim())
  return m ? m[1]! : null
}

export function normalizeSystem(v: unknown): SystemId | null {
  if (typeof v !== 'string') return null
  const k = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((SYSTEM_IDS as readonly string[]).includes(k)) return k as SystemId
  return SYSTEM_ALIASES[k] ?? null
}

export function normalizeLateralityValue(v: unknown): Laterality | null {
  if (typeof v !== 'string') return null
  const k = v.trim().toLowerCase()
  if ((LATERALITIES as readonly string[]).includes(k)) return k as Laterality
  if (k === 'r' || k === 'sağ' || k === 'sag') return 'right'
  if (k === 'l' || k === 'sol') return 'left'
  if (k === 'm' || k === 'median' || k === 'middle' || k === 'center' || k === 'centre') return 'midline'
  return null
}

const toList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v])

export function parseElements(raw: unknown, file = ELEMENTS_FILE): { elements: Bp3dElement[]; issues: Issue[] } {
  const issues: Issue[] = []
  const list = Array.isArray(raw) ? raw : isPlainObject(raw) && Array.isArray(raw.elements) ? raw.elements : null
  if (!list) {
    issues.push(warning('inventory_input', 'Öğe listesi bir dizi ya da { "elements": [...] } nesnesi olmalı; hiçbir öğe okunamadı.', { file }))
    return { elements: [], issues }
  }
  const elements: Bp3dElement[] = []
  list.forEach((item, i) => {
    const where = { file, recordId: `#${i + 1}` }
    if (!isPlainObject(item)) {
      issues.push(warning('inventory_input', 'Öğe bir nesne değil; atlandı.', where))
      return
    }
    const elementIdRaw = pick(item, ELEMENT_FIELD_ALIASES.elementId)
    const elementId = typeof elementIdRaw === 'string' || typeof elementIdRaw === 'number' ? String(elementIdRaw).trim() : ''
    const fmaId = normalizeFmaId(pick(item, ELEMENT_FIELD_ALIASES.fmaId))
    const nameRaw = pick(item, ELEMENT_FIELD_ALIASES.nameEn)
    const nameEn = typeof nameRaw === 'string' ? nameRaw.trim().replace(/\s+/g, ' ') : ''
    if (elementId) where.recordId = elementId
    if (!elementId || !fmaId || !nameEn) {
      const missing = [!elementId && 'elementId', !fmaId && 'fmaId', !nameEn && 'nameEn'].filter(Boolean).join(', ')
      issues.push(warning('inventory_input', `Zorunlu alan eksik ya da geçersiz (${missing}); öğe atlandı. Kalıcı kimlik uydurulmaz.`, where))
      return
    }
    const systemsRaw = toList(pick(item, ELEMENT_FIELD_ALIASES.system))
    const systems = [...new Set(systemsRaw.map(normalizeSystem).filter((s): s is SystemId => s !== null))]
    if (systems.length === 0) {
      issues.push(warning('inventory_input', `Sistem tanınmadı (${JSON.stringify(systemsRaw)}); öğe atlandı.`, where))
      return
    }
    const el: Bp3dElement = { elementId, fmaId, nameEn, systems }
    const chunk = pick(item, ELEMENT_FIELD_ALIASES.chunk)
    if (typeof chunk === 'string' && chunk.trim()) el.chunk = chunk.trim()
    const latRaw = pick(item, ELEMENT_FIELD_ALIASES.laterality)
    if (latRaw !== undefined) {
      const lat = normalizeLateralityValue(latRaw)
      if (lat) el.laterality = lat
      else issues.push(warning('inventory_input', `Taraf değeri tanınmadı (${JSON.stringify(latRaw)}); addan belirlenmeye çalışılacak.`, where))
    }
    const regions = toList(pick(item, ELEMENT_FIELD_ALIASES.regions)).filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    if (regions.length > 0) el.regions = regions.map((r) => r.trim())
    const kind = pick(item, ELEMENT_FIELD_ALIASES.kind)
    if (typeof kind === 'string') {
      if ((STRUCTURE_KINDS as readonly string[]).includes(kind)) el.kind = kind as StructureKind
      else issues.push(warning('inventory_input', `Yapı türü "${kind}" tanınmadı; yok sayıldı.`, where))
    }
    elements.push(el)
  })
  return { elements, issues }
}

/**
 * Mechanical kind guess from unambiguous English words in the name, then from the system.
 * Recorded in provenance notes as automatic; never treated as verified.
 */
const KIND_PATTERNS: [RegExp, StructureKind][] = [
  [/\btendon\b/, 'tendon'],
  [/\baponeurosis\b/, 'aponeurosis'],
  [/\bligament\b/, 'ligament'],
  [/\bcartilage\b/, 'cartilage'],
  [/\bmeniscus\b|\barticular disc\b|\bintervertebral disc\b/, 'articular_disc_or_meniscus'],
  [/\bbursa\b/, 'bursa_or_sheath'],
  [/\bfascia\b/, 'fascia'],
  [/\bmuscle\b/, 'muscle'],
  [/\bartery\b/, 'artery'],
  [/\bvein\b/, 'vein'],
  [/\bganglion\b/, 'ganglion'],
  [/\bnerve\b/, 'nerve'],
  [/\bbone\b|\bvertebra\b|\bphalanx\b/, 'bone'],
]
const SYSTEM_DEFAULT_KIND: Partial<Record<SystemId, StructureKind>> = { skeletal: 'bone', muscular: 'muscle' }

export function inferKind(nameEn: string, system: SystemId): { kind: StructureKind; basis: 'name' | 'system' | 'none' } {
  const n = nameEn.toLowerCase()
  for (const [re, kind] of KIND_PATTERNS) if (re.test(n)) return { kind, basis: 'name' }
  const bysystem = SYSTEM_DEFAULT_KIND[system]
  return bysystem ? { kind: bysystem, basis: 'system' } : { kind: 'other', basis: 'none' }
}

/** Key used to pair right/left instances: the name with its single side word masked. */
export function sideKey(nameEn: string): string | null {
  const n = nameEn.toLowerCase().replace(/\s+/g, ' ').trim()
  const matches = n.match(/\b(right|left)\b/g)
  if (!matches || matches.length !== 1) return null
  return n.replace(/\b(right|left)\b/, '*')
}

export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  if (isPlainObject(v)) {
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}

export interface InventoryOptions {
  /** ISO date used for new/changed records. */
  today: string
  /** Current inventory records (to keep createdAt/updatedAt stable across re-imports). */
  existing?: readonly unknown[]
  /** Region ids known to the taxonomy; chunk/region values outside it are dropped. */
  knownRegions?: ReadonlySet<string>
  /** Detail level per structure id from linked scope targets. */
  levelHints?: ReadonlyMap<string, DetailLevel>
}

export function buildInventory(elements: readonly Bp3dElement[], opts: InventoryOptions): { records: StructureInput[]; issues: Issue[] } {
  const issues: Issue[] = []
  const knownRegions = opts.knownRegions ?? new Set<string>(TOP_REGION_IDS)
  const groups = new Map<string, Bp3dElement[]>()
  for (const e of elements) {
    const g = groups.get(e.fmaId)
    if (g) g.push(e)
    else groups.set(e.fmaId, [e])
  }

  const records: StructureInput[] = []
  for (const [fmaId, group] of groups) {
    const id = `fma:${fmaId}`
    const first = group[0]!
    const where = { file: ELEMENTS_FILE, recordId: id }
    const elementIds = [...new Set(group.map((e) => e.elementId))]
    const names = [...new Set(group.map((e) => e.nameEn))]
    if (names.length > 1) issues.push(warning('inventory_input', `Aynı FMA kimliği için farklı adlar: ${names.map((n) => `"${n}"`).join(', ')}; ilk ad kullanıldı.`, where))
    const nameEn = first.nameEn
    const systems = [...new Set(group.flatMap((e) => e.systems))]

    const explicitLat = [...new Set(group.map((e) => e.laterality).filter((l): l is Laterality => l !== undefined))]
    if (explicitLat.length > 1) issues.push(warning('inventory_input', `Öğeler farklı taraf bildiriyor (${explicitLat.join(', ')}); ilki kullanıldı.`, where))
    let laterality: Laterality
    let latBasis: string
    if (explicitLat[0]) {
      laterality = explicitLat[0]
      latBasis = 'öğe verisinden alındı'
    } else {
      const fromName = lateralityFromEnglishName(nameEn)
      laterality = fromName ?? 'not_applicable'
      latBasis = fromName ? 'İngilizce addan türetildi' : 'belirlenemedi (not_applicable olarak bırakıldı; kontrol edilmeli)'
    }

    const regionSet = new Set<string>()
    for (const e of group) {
      const candidates = e.regions ?? (e.chunk ? [e.chunk.includes('/') ? e.chunk.split('/')[1]! : e.chunk] : [])
      for (const r of candidates) {
        if (knownRegions.has(r)) regionSet.add(r)
        else if (e.regions) issues.push(warning('inventory_input', `Bölge "${r}" taksonomide yok; yok sayıldı.`, where))
      }
    }
    const regions = [...regionSet].sort()

    const explicitKind = group.find((e) => e.kind)?.kind
    const inferred = explicitKind ? { kind: explicitKind, basis: 'element' as const } : inferKind(nameEn, systems[0]!)
    const kindBasis = {
      element: 'öğe verisinden alındı',
      name: 'İngilizce ad kalıbından otomatik türetildi',
      system: 'sistemden otomatik türetildi',
      none: 'belirlenemedi (other)',
    }[inferred.basis]

    const level = opts.levelHints?.get(id)
    const notes = [
      `BodyParts3D içe aktarımı (öğe: ${elementIds.join(', ')}).`,
      'İngilizce ad BodyParts3D verisinden alındı; TA2 ile karşılaştırılmadı.',
      `Tür: ${kindBasis}.`,
      `Taraf: ${latBasis}.`,
      `Bölge: ${regions.length > 0 ? 'model parçasından (chunk) türetildi' : 'atanmadı'}.`,
      `Ayrıntı düzeyi: ${level ? 'kapsam hedefinden alındı' : 'atanmadı (varsayılan basic)'}.`,
      'Cinsiyet atanmadı (varsayılan both).',
    ].join(' ')

    const rec: StructureInput = {
      id,
      schemaVersion: 1,
      kind: inferred.kind,
      names: {
        en: { value: nameEn, status: 'unverified', sources: [{ sourceId: BP3D_SOURCE_ID, locator: `öğe ${elementIds.join(', ')}` }] },
      },
      externalIds: { fma: fmaId, bp3dRepresentation: first.elementId },
      systems,
      regions,
      regionBasis: regions.length > 0 ? 'derived_from_geometry' : 'unassigned',
      laterality,
      detailLevel: level ?? 'basic',
      review: { text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' },
      provenance: { createdBy: 'import:bodyparts3d', createdAt: opts.today, updatedAt: opts.today, notes },
    }
    records.push(rec)
  }

  linkCounterparts(records, issues)
  keepStableDates(records, opts.existing ?? [])
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { records: records.map(orderKeys), issues }
}

/** Fixed key order so inventory files read naturally and diff cleanly. */
const KEY_ORDER = [
  'id',
  'schemaVersion',
  'kind',
  'names',
  'externalIds',
  'systems',
  'regions',
  'regionBasis',
  'laterality',
  'counterpartId',
  'genericId',
  'parentIds',
  'detailLevel',
  'review',
  'provenance',
]
function orderKeys(r: StructureInput): StructureInput {
  const src = r as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of KEY_ORDER) if (src[k] !== undefined) out[k] = src[k]
  for (const k of Object.keys(src)) if (!(k in out) && src[k] !== undefined) out[k] = src[k]
  return out as StructureInput
}

/** Pair right/left instances whose English names differ only in the side word. */
function linkCounterparts(records: StructureInput[], issues: Issue[]): void {
  const byKey = new Map<string, { right: StructureInput[]; left: StructureInput[] }>()
  for (const r of records) {
    if (r.laterality !== 'right' && r.laterality !== 'left') continue
    const key = sideKey(r.names.en.value)
    if (!key) continue
    const entry = byKey.get(key) ?? { right: [], left: [] }
    entry[r.laterality].push(r)
    byKey.set(key, entry)
  }
  for (const [key, { right, left }] of byKey) {
    if (right.length === 1 && left.length === 1) {
      right[0]!.counterpartId = left[0]!.id
      left[0]!.counterpartId = right[0]!.id
    } else if (right.length > 0 && left.length > 0) {
      issues.push(
        warning('inventory_input', `"${key}" için karşı taraf eşleşmesi belirsiz (${right.length} sağ, ${left.length} sol); bağlantı kurulmadı.`, {
          file: ELEMENTS_FILE,
        }),
      )
    }
  }
}

function withoutDates(r: unknown): string {
  if (!isPlainObject(r)) return stableStringify(r)
  const prov = isPlainObject(r.provenance) ? { ...r.provenance, createdAt: null, updatedAt: null } : r.provenance
  return stableStringify({ ...r, provenance: prov })
}

function keepStableDates(records: StructureInput[], existing: readonly unknown[]): void {
  const old = new Map<string, Record<string, unknown>>()
  for (const r of existing) if (isPlainObject(r) && typeof r.id === 'string') old.set(r.id, r)
  for (const r of records) {
    const prev = old.get(r.id)
    if (!prev || !isPlainObject(prev.provenance)) continue
    const createdAt = prev.provenance.createdAt
    const updatedAt = prev.provenance.updatedAt
    if (typeof createdAt === 'string') r.provenance.createdAt = createdAt
    if (typeof updatedAt === 'string' && withoutDates(prev) === withoutDates(r)) r.provenance.updatedAt = updatedAt
  }
}

/** Inventory file name per primary system: content/structures/_inventory/<system>.json. */
export function groupBySystem(records: readonly StructureInput[]): Map<SystemId, StructureInput[]> {
  const out = new Map<SystemId, StructureInput[]>()
  for (const r of records) {
    const sys = r.systems[0]!
    const list = out.get(sys)
    if (list) list.push(r)
    else out.set(sys, [r])
  }
  return out
}
