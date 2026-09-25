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
  term: { la?: string; en?: string }
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
    if (s.kind === 'muscle' && !/\bmuscle\b/.test(b)) out.push(`${b} muscle`, `${britishVariant(b)} muscle`)
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
    for (const e of [t.term.en, ...(t.synonyms?.en ?? [])]) {
      if (!e) continue
      add(normalizeEn(e), t.id)
      add(britishVariant(normalizeEn(e)), t.id)
    }
  }
  return { byId, byEn }
}

export type MatchBasis = 'wikidata' | 'name'

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
  return null
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
