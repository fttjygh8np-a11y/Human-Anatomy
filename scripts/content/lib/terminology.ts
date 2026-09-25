/**
 * Terminology enrichment (pure logic; network access lives in ../terminology.ts).
 *
 * Inputs:
 *  - TA2 term list (id, Latin/English term, synonyms) as published in the OpenAnatomy TA2 Viewer.
 *  - Wikidata FMA -> TA2 id links (P1402 / P7173).
 *  - Turkish candidates (content/terminology/tr-adaylari.json) confirmed in the TDK dictionary.
 *
 * Output: structure overlays adding `names.la` (TA2), TA2 synonyms, `externalIds.ta2` and, when
 * confirmed, `names.tr`. All names stay "unverified" (no human expert has checked them); every
 * name cites its source with a precise locator. Nothing is invented: a structure without an
 * unambiguous TA2 match gets no Latin name.
 */

export interface Ta2Term {
  id: number
  /** TA2 gives either one English term or US/UK spellings (en_US / en_GB). */
  term: { la?: string; en?: string; en_US?: string; en_GB?: string }
  synonyms?: { la?: string[]; en?: string[] }
  parent?: number
}

export interface TdkEvidence {
  /** Dictionary headword, e.g. "kol kemiği". */
  madde: string
  maddeId: string
  /** The sense whose tag is anatomy/medicine (quoted as evidence). */
  definition: string
}

export interface StructureLike {
  id: string
  names: { en: { value: string } }
  laterality: string
  kind: string
  externalIds: { fma?: string }
}

export const TA2_SOURCE = 'src:fipat-ta2'
export const TDK_SOURCE = 'src:tdk-gts'

export function normalizeEn(s: string): string {
  return s.toLowerCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** American -> British spellings used by TA2 English terms. */
export function britishVariant(s: string): string {
  return s
    .replace(/\bceliac\b/g, 'coeliac')
    .replace(/esophag/g, 'oesophag')
    .replace(/\bhem(?=[a-z])/g, 'haem')
    .replace(/\bfetal\b/g, 'foetal')
}

export function stripSide(s: string): string {
  return s.replace(/\b(right|left)\b/g, ' ').replace(/\s+/g, ' ').trim()
}

export function nameVariants(s: StructureLike): string[] {
  const n = normalizeEn(s.names.en.value)
  const base = [n]
  if (s.laterality === 'right' || s.laterality === 'left') base.push(stripSide(n))
  const out: string[] = []
  for (const b of base) {
    out.push(b, britishVariant(b))
    if ((s.kind === 'muscle' || s.kind === 'other') && !/\bmuscle\b/.test(b)) {
      out.push(`${b} muscle`, `${britishVariant(b)} muscle`)
      // BodyParts3D "opponens digiti minimi of hand" / TA2 "opponens digiti minimi muscle of hand".
      const of = /^(.+?) of (.+)$/.exec(b)
      if (of) out.push(`${of[1]} muscle of ${of[2]}`)
    }
    // BodyParts3D "… segmental bronchial tree" / TA2 "… segmental bronchus".
    const bronchus = b.replace(/bronchial tree$/, 'bronchus')
    if (bronchus !== b) out.push(bronchus)
    // "right medial basal segmental bronchus" / TA2 "medial basal segmental bronchus of right lung".
    for (const x of [b, bronchus]) {
      const lung = /^(right|left) (.+ (?:segmental bronchus|segment))$/.exec(x)
      if (lung) out.push(`${lung[2]} of ${lung[1]} lung`)
    }
    // TA2 names paired/multiple vessels and nerves as a group: "obturator veins", "lumbar arteries".
    const plural = b.replace(/ vein$/, ' veins').replace(/ artery$/, ' arteries').replace(/ nerve$/, ' nerves').replace(/ branch$/, ' branches')
    if (plural !== b) out.push(plural, britishVariant(plural))
    // BodyParts3D "triquetral" / TA2 "triquetrum bone"; "scaphoid" / "scaphoid bone".
    if (s.kind === 'bone' && !/\bbone\b/.test(b)) out.push(`${b} bone`, `${b.replace(/\btriquetral\b/, 'triquetrum')} bone`)
  }
  return [...new Set(out)]
}

export function indexTa2(terms: readonly Ta2Term[]) {
  const byId = new Map<number, Ta2Term>()
  const byEn = new Map<string, Set<number>>()
  const add = (k: string, id: number) => {
    const set = byEn.get(k) ?? new Set<number>()
    set.add(id)
    byEn.set(k, set)
  }
  for (const t of terms) {
    byId.set(t.id, t)
    for (const e of [t.term.en, t.term.en_US, t.term.en_GB, ...(t.synonyms?.en ?? [])]) {
      if (!e) continue
      add(normalizeEn(e), t.id)
      add(britishVariant(normalizeEn(e)), t.id)
    }
  }
  return { byId, byEn }
}

export type MatchBasis = 'wikidata' | 'name' | 'hierarchy'

/** Unambiguous TA2 term for a structure: Wikidata link first, then exact English-name match. */
export function matchTa2(
  s: StructureLike,
  ta2: ReturnType<typeof indexTa2>,
  wikidataTa2: ReadonlyMap<string, readonly string[]>,
): { term: Ta2Term; basis: MatchBasis } | null {
  const ids = s.externalIds.fma ? (wikidataTa2.get(s.externalIds.fma) ?? []) : []
  if (ids.length === 1) {
    const t = ta2.byId.get(Number(ids[0]))
    if (t?.term.la) return { term: t, basis: 'wikidata' }
  }
  for (const v of nameVariants(s)) {
    const hit = ta2.byEn.get(v)
    if (hit && hit.size === 1) {
      const t = ta2.byId.get([...hit][0]!)
      if (t?.term.la) return { term: t, basis: 'name' }
    }
  }
  // "A of B" (e.g. "deltoid branch of thoraco-acromial artery"): TA2 lists A under B, so A is
  // accepted only when exactly one TA2 term named A has an ancestor named B.
  for (const v of nameVariants(s)) {
    const of = /^(.+?) of (.+)$/.exec(v)
    if (!of) continue
    const candidates = [...(ta2.byEn.get(of[1]!) ?? [])].filter((id) => hasAncestorNamed(ta2, id, of[2]!))
    if (candidates.length === 1) {
      const t = ta2.byId.get(candidates[0]!)
      if (t?.term.la) return { term: t, basis: 'hierarchy' }
    }
  }
  return null
}

/** English forms of a TA2 term, normalised as in the index. */
export function englishForms(t: Ta2Term): string[] {
  return [t.term.en, t.term.en_US, t.term.en_GB, ...(t.synonyms?.en ?? [])]
    .filter((e): e is string => !!e)
    .flatMap((e) => [normalizeEn(e), britishVariant(normalizeEn(e))])
}

function hasAncestorNamed(ta2: ReturnType<typeof indexTa2>, id: number, name: string): boolean {
  const wanted = new Set([name, britishVariant(name)])
  let cur = ta2.byId.get(id)
  for (let depth = 0; cur?.parent !== undefined && depth < 12; depth++) {
    cur = ta2.byId.get(cur.parent)
    if (cur && englishForms(cur).some((e) => wanted.has(e))) return true
  }
  return false
}

export const SIDE_TR: Record<'right' | 'left', string> = { right: 'Sağ', left: 'Sol' }

export function capitalizeTr(s: string): string {
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)
}

/** Overlay for one structure. `tr` is applied only when the TA2 term has a TDK-confirmed name. */
export function buildOverlay(
  s: StructureLike,
  match: { term: Ta2Term; basis: MatchBasis },
  tr: TdkEvidence | undefined,
  retrieved: { ta2Url: string; date: string },
): Record<string, unknown> {
  const t = match.term
  const locator = `TA2 ID ${t.id}`
  const basisNote =
    match.basis === 'wikidata'
      ? `FMA ${s.externalIds.fma} → TA2 ${t.id} eşlemesi Wikidata'dan (P1402/P7173).`
      : match.basis === 'hierarchy'
        ? `TA2 ${t.id}, İngilizce adın "A of B" biçimiyle bulundu: A terimi TA2 hiyerarşisinde B'nin altında yer alıyor.`
        : `TA2 ${t.id}, İngilizce adın TA2 terimiyle birebir eşleşmesiyle bulundu.`
  const sided = s.laterality === 'right' || s.laterality === 'left'
  const note = `${retrieved.ta2Url} üzerinden ${retrieved.date} tarihinde okundu. ${basisNote}${sided ? ' TA2 terimi taraf belirtmez; taraf ayrı alanda tutulur.' : ''}`
  const synonyms = [
    ...(t.synonyms?.la ?? []).map((v) => ({ value: v, lang: 'la', kind: 'synonym', sources: [{ sourceId: TA2_SOURCE, locator }] })),
    ...(t.synonyms?.en ?? []).map((v) => ({ value: v, lang: 'en', kind: 'synonym', sources: [{ sourceId: TA2_SOURCE, locator }] })),
  ]
  const names: Record<string, unknown> = {
    la: { value: t.term.la, status: 'unverified', sources: [{ sourceId: TA2_SOURCE, locator, note }] },
  }
  if (tr) {
    const value = sided ? `${SIDE_TR[s.laterality as 'right' | 'left']} ${tr.madde}` : capitalizeTr(tr.madde)
    names.tr = {
      value,
      status: 'unverified',
      sources: [
        {
          sourceId: TDK_SOURCE,
          locator: `madde "${tr.madde}" (madde_id ${tr.maddeId})`,
          note: `TDK tanımı: "${tr.definition}". TA2 ${t.id} (${t.term.la}) karşılığı olarak seçildi.${sided ? ' Taraf sözcüğü eklendi.' : ''}`,
        },
      ],
    }
  }
  return {
    id: s.id,
    names,
    ...(synonyms.length > 0 ? { synonyms } : {}),
    externalIds: { ta2: String(t.id) },
  }
}

export const WIKIDATA_SOURCE = 'src:wikidata'

export interface WikidataTr {
  item: string
  label: string
  trwiki?: string
  /** True when the label belongs to the generic concept and the side word was added. */
  composed: boolean
}

/** Rejects labels that are untranslated English copies (e.g. "Right superior gluteal vein"). */
export function usableTrLabel(label: string, en: string): boolean {
  if (/\b(of|the|and|right|left|artery|vein|muscle|bone|nerve|branch|tributary|part|set|segment|lobe)\b/i.test(label)) return false
  // Literal machine translations such as "hepatic artery proper" -> "karaciğer arterinin kendisi".
  if (/\bkendisi\b/i.test(label)) return false
  // A label identical to a multi-word English name is an untranslated copy; single-word Latin-origin terms are used in Turkish.
  if (label.trim().toLowerCase() === en.trim().toLowerCase() && /\s/.test(en.trim())) return false
  return label.trim().length > 1
}

export function wikidataTrName(s: StructureLike, wd: WikidataTr): Record<string, unknown> {
  const base = wd.label.trim()
  const value = wd.composed ? `${SIDE_TR[s.laterality as 'right' | 'left']} ${base.charAt(0).toLocaleLowerCase('tr') + base.slice(1)}` : capitalizeTr(base)
  return {
    value,
    status: 'unverified',
    sources: [
      {
        sourceId: WIKIDATA_SOURCE,
        locator: `${wd.item} (Türkçe etiket)`,
        note: `Topluluk tarafından düzenlenen Wikidata etiketi${wd.trwiki ? `; Türkçe Vikipedi maddesi: "${wd.trwiki}"` : ''}. TDK'da anatomi/tıp anlamlı madde bulunamadığı için ikinci kaynak olarak kullanıldı.${wd.composed ? ' Etiket genel kavrama aittir; taraf sözcüğü eklendi.' : ''}`,
      },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Rule-based Latin names for numbered/digit-specific structures that TA2 lists only as a class
// (TA2 itself writes numbered members as "vertebra cervicalis VI"). The base term and the digit
// come from TA2; only the numeral and the fixed genitive of the digit are added.
// ---------------------------------------------------------------------------------------------

const ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Digit → [TA2 id of the digit, Latin genitive used after "phalanx …", limb]. */
const DIGIT: Record<string, [number, string, 'manus' | 'pedis']> = {
  thumb: [151, 'pollicis', 'manus'],
  'index finger': [152, 'indicis', 'manus'],
  'middle finger': [153, 'digiti medii manus', 'manus'],
  'ring finger': [154, 'digiti anularis', 'manus'],
  'little finger': [155, 'digiti minimi manus', 'manus'],
  'big toe': [171, 'hallucis', 'pedis'],
  'second toe': [172, 'digiti secundi pedis', 'pedis'],
  'third toe': [173, 'digiti tertii pedis', 'pedis'],
  'fourth toe': [174, 'digiti quarti pedis', 'pedis'],
  'little toe': [175, 'digiti minimi pedis', 'pedis'],
}

export interface DerivedLatin {
  la: string
  /** TA2 terms the name is built from. */
  ta2Ids: number[]
  /** Turkish description of the rule, shown in the source note. */
  rule: string
}

function ta2ByEnglish(ta2: ReturnType<typeof indexTa2>, en: string): Ta2Term | undefined {
  const hit = ta2.byEn.get(normalizeEn(en))
  return hit && hit.size === 1 ? ta2.byId.get([...hit][0]!) : undefined
}

/** Latin name for a numbered vertebra/rib or a digit-specific phalanx, or null. Side words are ignored. */
export function deriveLatin(enName: string, ta2: ReturnType<typeof indexTa2>): DerivedLatin | null {
  const n = stripSide(normalizeEn(enName))
  let m = /^(\w+) (cervical|thoracic|lumbar) vertebra$/.exec(n)
  if (m) {
    const k = ORDINAL[m[1]!]
    const max = { cervical: 7, thoracic: 12, lumbar: 5 }[m[2] as 'cervical' | 'thoracic' | 'lumbar']
    const base = ta2ByEnglish(ta2, `${m[2]} vertebra`)
    if (!k || k > max || !base?.term.la) return null
    return { la: `${base.term.la} ${ROMAN[k]}`, ta2Ids: [base.id], rule: `TA2 "${base.term.la}" terimine omur numarası (Roma rakamı) eklendi; TA2 aynı biçimi kullanır (ör. "vertebra cervicalis VI").` }
  }
  m = /^(\w+) rib$/.exec(n)
  if (m) {
    const k = ORDINAL[m[1]!]
    const base = ta2ByEnglish(ta2, 'rib')
    if (!k || k < 3 || !base?.term.la) return null // first/second rib have their own TA2 terms
    return { la: `${base.term.la} ${ROMAN[k]}`, ta2Ids: [base.id], rule: `TA2 "${base.term.la}" terimine kaburga numarası (Roma rakamı) eklendi.` }
  }
  m = /^(distal|middle|proximal) phalanx of (.+)$/.exec(n)
  if (m) {
    const digit = DIGIT[m[2]!]
    if (!digit) return null
    const [digitId, genitive, limb] = digit
    if (m[1] === 'middle' && (digitId === 151 || digitId === 171)) return null // thumb and big toe have two phalanges
    const base = ta2ByEnglish(ta2, `${m[1]} phalanx of ${limb === 'manus' ? 'hand' : 'foot'}`)
    const d = ta2.byId.get(digitId)
    if (!base?.term.la || !d?.term.la) return null
    const stem = base.term.la.replace(/ (manus|pedis)$/, '')
    return {
      la: `${stem} ${genitive}`,
      ta2Ids: [base.id, digitId],
      rule: `TA2 "${base.term.la}" ve parmak terimi "${d.term.la}" birleştirildi (parmak adı tamlayan hâlinde).`,
    }
  }
  return null
}

/** Name overlay for a rule-derived Latin name (status "unverified"). */
export function derivedOverlay(s: StructureLike, d: DerivedLatin, retrieved: { ta2Url: string; date: string }): Record<string, unknown> {
  return {
    id: s.id,
    names: {
      la: {
        value: d.la,
        status: 'unverified',
        sources: [
          {
            sourceId: TA2_SOURCE,
            locator: d.ta2Ids.map((id) => `TA2 ID ${id}`).join(' + '),
            note: `Kurallı türetme (TA2'de bu yapı için ayrı terim yok): ${d.rule} ${retrieved.ta2Url} üzerinden ${retrieved.date} tarihinde okundu.`,
          },
        ],
      },
    },
  }
}
