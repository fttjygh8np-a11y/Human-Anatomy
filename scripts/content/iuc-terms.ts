/**
 * `npm run content:iuc-terms` — Turkish names from the İÜC textbooks (CC BY 4.0).
 *
 *  1. Extracts "Latin (Türkçe)" / "Türkçe (Latin)" pairs from the page texts (npm run content:iuc)
 *     where the Latin side is a TA2 term.
 *  2. Uses only pairs accepted by hand in content/terminology/iuc-kabul.json; every accepted pair
 *     must be backed by an extracted pair (the quote), otherwise the command fails.
 *  3. Maps each Latin term to structures (same TA2 id or same Latin name) and writes the overlay
 *     content/structures/terminoloji/iuc-adlar.json: `names.tr` from the book (quote + page as
 *     source), the previous TDK/Wikidata name kept as a synonym. Right/left instances get "Sağ/Sol".
 *  4. Writes the full candidate list to content/terminology/iuc-terimler.json for review.
 *
 * All names stay "unverified": the quote check proves the book writes the pair, not that the pair
 * is attached to the right 3D structure; that needs an anatomist.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Structure } from '../../src/core/schema.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'
import { extractTermPairs, IUC_BOOKS, latinKey, type BookPage, type TermPair } from './lib/iuc.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'
import { capitalizeTr, SIDE_TR, type Ta2Term } from './lib/terminology.ts'

interface Acceptance {
  latin: string
  /** Display form (sentence case). */
  tr: string
  /** Spelling in the book when the display form corrects it. */
  kitaptaki?: string
  /** Latin name of the target structure when it differs from the book's term (e.g. femur → os femoris). */
  yapiLatince?: string
  not?: string
}

const BOOK_LABEL: Record<string, string> = {
  'src:iuc-lokomotor': 'Lokomotor',
  'src:iuc-ic-organlar': 'İç Organlar',
  'src:iuc-noroanatomi': 'Nöroanatomi',
}

/** Normalised Turkish form used to compare and count variants of the same name. */
const trKey = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()

async function main(): Promise<number> {
  const ta2 = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8')) as { data: Ta2Term[] }).data
  const idsByLatin = new Map<string, Set<number>>()
  for (const t of ta2) {
    for (const la of [t.term.la, ...(t.synonyms?.la ?? [])]) {
      if (!la) continue
      const k = latinKey(la)
      idsByLatin.set(k, (idsByLatin.get(k) ?? new Set()).add(t.id))
    }
  }
  const latinTerms = new Set(idsByLatin.keys())

  const pairs: TermPair[] = []
  for (const b of IUC_BOOKS) {
    const file = join(REPO_ROOT, 'vendor', 'iuc', `${b.file}.pages.json`)
    let pages: BookPage[]
    try {
      pages = (JSON.parse(await readFile(file, 'utf8')) as { pages: BookPage[] }).pages
    } catch {
      console.error(`${file} yok; önce "npm run content:iuc" çalıştırın.`)
      return 1
    }
    pairs.push(...extractTermPairs(b.sourceId, pages, latinTerms))
  }

  const accepted = (JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'iuc-kabul.json'), 'utf8')) as { kabul: Acceptance[] }).kabul
  const evidence = (a: Acceptance): TermPair | undefined =>
    pairs
      .filter((p) => p.latin === a.latin && trKey(p.tr).endsWith(trKey(a.kitaptaki ?? a.tr)))
      .sort((x, y) => x.printed - y.printed)[0]
  const unbacked = accepted.filter((a) => !evidence(a))
  if (unbacked.length > 0) {
    console.error(`Kitapta alıntısı bulunamayan kabul(ler): ${unbacked.map((a) => `${a.latin} → ${a.tr}`).join('; ')}`)
    return 1
  }

  const { content } = await loadContent(pathsFromArgs())
  const structuresByTa2 = new Map<string, Structure[]>()
  const structuresByLatin = new Map<string, Structure[]>()
  for (const s of content.structures) {
    if (s.externalIds.ta2) structuresByTa2.set(s.externalIds.ta2, [...(structuresByTa2.get(s.externalIds.ta2) ?? []), s])
    if (s.names.la) structuresByLatin.set(latinKey(s.names.la.value), [...(structuresByLatin.get(latinKey(s.names.la.value)) ?? []), s])
  }

  // Review list: every extracted pair grouped by Latin term, with the accepted form marked.
  const byLatin = new Map<string, TermPair[]>()
  for (const p of pairs) byLatin.set(p.latin, [...(byLatin.get(p.latin) ?? []), p])
  const acceptedByLatin = new Map(accepted.map((a) => [a.latin, a]))
  const candidates = [...byLatin.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([latin, list]) => {
      const forms = new Map<string, TermPair[]>()
      for (const p of list) forms.set(trKey(p.tr), [...(forms.get(trKey(p.tr)) ?? []), p])
      return {
        latin,
        accepted: acceptedByLatin.get(latin)?.tr ?? null,
        forms: [...forms.values()]
          .sort((a, b) => b.length - a.length)
          .map((r) => ({ tr: r[0]!.tr, count: r.length, pages: r.map((p) => `${BOOK_LABEL[p.sourceId]} s. ${p.printed}`) })),
      }
    })

  const overlays: Record<string, unknown>[] = []
  let mappedTerms = 0
  for (const a of accepted) {
    const ev = evidence(a)!
    const targets = new Map<string, Structure>()
    for (const id of idsByLatin.get(a.latin) ?? []) for (const s of structuresByTa2.get(String(id)) ?? []) targets.set(s.id, s)
    for (const s of structuresByLatin.get(a.latin) ?? []) targets.set(s.id, s)
    if (a.yapiLatince) for (const s of structuresByLatin.get(latinKey(a.yapiLatince)) ?? []) targets.set(s.id, s)
    if (targets.size > 0) mappedTerms++
    for (const s of targets.values()) {
      const sided = s.laterality === 'right' || s.laterality === 'left'
      const value = sided ? `${SIDE_TR[s.laterality as 'right' | 'left']} ${a.tr.charAt(0).toLocaleLowerCase('tr') + a.tr.slice(1)}` : capitalizeTr(a.tr)
      const prev = s.names.tr
      const synonyms = prev && trKey(prev.value) !== trKey(value) ? [{ value: prev.value, lang: 'tr', kind: 'synonym', sources: prev.sources }] : []
      overlays.push({
        id: s.id,
        names: {
          tr: {
            value,
            status: 'unverified',
            sources: [
              {
                sourceId: ev.sourceId,
                locator: `s. ${ev.printed}`,
                quote: ev.quote,
                note: [
                  `Kitapta "${ev.quote}" olarak geçer; Latince terim TA2 ile eşleştirildi.`,
                  a.yapiLatince ? `Yapının Latince adı "${a.yapiLatince}" kitaptaki "${a.latin}" terimiyle eşanlamlı kabul edildi.` : '',
                  a.not ?? '',
                  sided ? 'Taraf sözcüğü eklendi.' : '',
                ]
                  .filter(Boolean)
                  .join(' '),
              },
            ],
          },
        },
        ...(synonyms.length ? { synonyms } : {}),
      })
    }
  }

  await writeFile(join(CONTENT_DIR, 'terminology', 'iuc-terimler.json'), prettyJson({ note: 'Otomatik üretilir (npm run content:iuc-terms); elle düzenlemeyin. Ret için iuc-dislama.json.', candidates }))
  overlays.sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  await writeFile(join(CONTENT_DIR, 'structures', 'terminoloji', 'iuc-adlar.json'), prettyJson(overlays))
  console.log(
    `İÜC terim çifti: ${pairs.length}; ayrı Latince terim: ${candidates.length}; elle kabul edilen: ${accepted.length} ` +
      `(yapıya eşlenen ${mappedTerms}); Türkçe ad eklenen yapı: ${overlays.length}.`,
  )
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('İÜC terimleri çıkarılamadı:', e)
    process.exitCode = 1
  },
)
