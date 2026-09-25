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
  isaParents: ['isaParents', 'isa_parents', 'isa'],
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
  /** Direct is-a parents in BodyParts3D (FMA digits), e.g. "Right humerus" is-a "Humerus". */
  isaParents?: string[]
  /** Side of the model centroid relative to the body midline (model pipeline check). */
  observedSide?: 'left' | 'right' | 'midline'
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
    const isa = toList(pick(item, ELEMENT_FIELD_ALIASES.isaParents))
      .map(normalizeFmaId)
      .filter((x): x is string => x !== null)
    if (isa.length > 0) el.isaParents = [...new Set(isa)]
    const chunk = pick(item, ELEMENT_FIELD_ALIASES.chunk)
    if (typeof chunk === 'string' && chunk.trim()) el.chunk = chunk.trim()
    let latRaw = pick(item, ELEMENT_FIELD_ALIASES.laterality)
    // Model pipeline shape: { fromName: 'left'|'right'|null, observed, offsetXM }. The name-stated
    // side labels the concept; the observed side is only used when the name states none.
    let observedSide: Bp3dElement['observedSide']
    if (isPlainObject(latRaw)) {
      const o = latRaw.observed
      if (o === 'left' || o === 'right' || o === 'midline') observedSide = o
      latRaw = latRaw.fromName ?? undefined
    }
    if (observedSide) el.observedSide = observedSide
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
  /** Detail level per structure id from linked scope targets (applies to sided instances too). */
  levelHints?: ReadonlyMap<string, DetailLevel>
  /** English names of FMA concepts from the BodyParts3D relation lists (FMA digits -> name). */
  conceptNames?: ReadonlyMap<string, string>
}

/** Name of a sided instance without its side word ("Proximal phalanx of right thumb" -> "proximal phalanx of thumb"). */
export function sidelessName(nameEn: string): string | null {
  const key = sideKey(nameEn)
  return key === null ? null : key.replace('*', ' ').replace(/\s+/g, ' ').trim()
}

export const UNASSIGNED_LEVEL: DetailLevel = 'advanced'
const LEVEL_NOTE_UNASSIGNED = `Ayrıntı düzeyi: atanmadı (varsayılan ${UNASSIGNED_LEVEL}; temel/orta düzey sınavlara girmez).`
const LEVEL_NOTE_SCOPE = 'Ayrıntı düzeyi: kapsam hedefinden alındı.'

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
      const observed = [...new Set(group.map((e) => e.observedSide).filter((x) => x !== undefined))]
      if (fromName) {
        laterality = fromName
        latBasis = 'İngilizce addan türetildi'
      } else if (observed.length === 1) {
        // No side in the name: a model centred on the midline is a midline structure, otherwise unpaired.
        laterality = observed[0] === 'midline' ? 'midline' : 'unpaired'
        latBasis = `adda taraf yok; model merkezinin orta hatta ${observed[0] === 'midline' ? 'olmasından' : 'olmamasından'} türetildi (${laterality})`
      } else {
        laterality = 'not_applicable'
        latBasis = 'belirlenemedi (not_applicable olarak bırakıldı; kontrol edilmeli)'
      }
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
      level ? LEVEL_NOTE_SCOPE : LEVEL_NOTE_UNASSIGNED,
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
      detailLevel: level ?? UNASSIGNED_LEVEL,
      review: { text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' },
      provenance: { createdBy: 'import:bodyparts3d', createdAt: opts.today, updatedAt: opts.today, notes },
    }
    records.push(rec)
  }

  linkCounterparts(records, issues)
  addGenericConcepts(records, groups, opts)
  keepStableDates(records, opts.existing ?? [])
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { records: records.map(orderKeys), issues }
}

/**
 * Generic (side-less) concepts of right/left instances, from the BodyParts3D is-a list:
 * "Right humerus" is-a "Humerus" (FMA13303). The generic record has no model of its own; it
 * groups both sides. Linked only when the concept name equals the instance name without its
 * side word, so an unrelated is-a parent is never used.
 */
function addGenericConcepts(records: StructureInput[], groups: ReadonlyMap<string, readonly Bp3dElement[]>, opts: InventoryOptions): void {
  const names = opts.conceptNames ?? new Map<string, string>()
  const byId = new Map(records.map((r) => [r.id, r]))
  const instancesOf = new Map<string, StructureInput[]>()
  for (const r of records) {
    if (r.laterality !== 'right' && r.laterality !== 'left') continue
    const fma = r.externalIds?.fma
    const parents = [...new Set((groups.get(fma ?? '') ?? []).flatMap((e) => e.isaParents ?? []))]
    if (parents.length !== 1) continue
    const p = parents[0]!
    // A concept that has its own model (e.g. an unpaired vessel) is not a side-less grouping.
    const own = byId.get(`fma:${p}`)
    if (own && own.laterality !== 'paired_generic') continue
    const conceptName = names.get(p)
    const sideless = sidelessName(r.names.en.value)
    if (!conceptName || !sideless || conceptName.toLowerCase().replace(/\s+/g, ' ').trim() !== sideless) continue
    r.genericId = `fma:${p}`
    const list = instancesOf.get(p) ?? []
    list.push(r)
    instancesOf.set(p, list)
  }
  for (const [p, instances] of instancesOf) {
    const id = `fma:${p}`
    const first = instances[0]!
    const hint = opts.levelHints?.get(id)
    const existing = byId.get(id)
    if (!existing) {
      const name = names.get(p)!
      const regions = [...new Set(instances.flatMap((i) => i.regions ?? []))].sort()
      const rec: StructureInput = {
        id,
        schemaVersion: 1,
        kind: first.kind,
        names: {
          en: {
            value: name.charAt(0).toUpperCase() + name.slice(1),
            status: 'unverified',
            sources: [{ sourceId: BP3D_SOURCE_ID, locator: `isa_inclusion_relation_list.txt (FMA${p})` }],
          },
        },
        externalIds: { fma: p },
        systems: first.systems,
        regions,
        regionBasis: regions.length > 0 ? 'derived_from_geometry' : 'unassigned',
        laterality: 'paired_generic',
        detailLevel: hint ?? UNASSIGNED_LEVEL,
        review: { text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' },
        provenance: {
          createdBy: 'import:bodyparts3d',
          createdAt: opts.today,
          updatedAt: opts.today,
          notes: [
            `Genel (taraf belirtmeyen) kavram; BodyParts3D is-a listesinde ${instances.map((i) => i.id).join(', ')} kayıtlarının üst kavramı.`,
            'Kendi modeli yoktur; sağ/sol örneklerin modelleriyle gösterilir.',
            'İngilizce ad BodyParts3D ilişki listesinden alındı; TA2 ile karşılaştırılmadı.',
            hint ? LEVEL_NOTE_SCOPE : LEVEL_NOTE_UNASSIGNED,
          ].join(' '),
        },
      }
      records.push(rec)
      byId.set(id, rec)
    }
    // Instances inherit the generic concept's scope level unless they have their own.
    if (hint) {
      for (const i of instances) {
        if (opts.levelHints?.get(i.id)) continue
        i.detailLevel = hint
        i.provenance.notes = (i.provenance.notes ?? '').replace(LEVEL_NOTE_UNASSIGNED, 'Ayrıntı düzeyi: genel kavramın kapsam hedefinden alındı.')
      }
    }
  }
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
