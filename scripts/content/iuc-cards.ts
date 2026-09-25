/**
 * `npm run content:iuc-cards` — info-card text (summary, description) for bones, organs and
 * nervous-system structures from the three İÜC textbooks (CC BY 4.0).
 *
 * The books introduce a structure with a heading line such as "- Humerus (Kol kemiği):",
 * "Os Frontale (Alın Kemiği)" or "Mesencephalon (Orta Beyin)" followed by prose. A heading whose
 * Latin side is a TA2 term (abbreviations "M./N./A./V./Lig." expanded) is matched to structures;
 * Title-case headings that are a TA2 term on their own ("Colon Ascendens", "Pancreas") count too.
 * From the prose, the first sentence that names the structure and says where it lies ("… yer alır",
 * "… bulunur") becomes the location, the first other sentence naming it the summary, and the next
 * sentences (up to ~700 characters) the description, each verbatim with page and quote
 * (content:quotecheck).
 *
 * Only empty fields are filled, and fields written by other İÜC generators (e.g. muscles) are
 * kept. Output (generated): content/structures/iuc/kartlar.json. All text stays "unverified".
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Structure } from '../../src/core/schema.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'
import { IUC_BOOKS, latinKey, normalizeForQuote, quoteOccurs, splitSentences, type BookPage } from './lib/iuc.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'
import type { Ta2Term } from './lib/terminology.ts'

const OUT = join('structures', 'iuc', 'kartlar.json')
/** Note on every source written here, so re-runs can tell their own fields from others. */
const MARK = 'Kitaptaki başlıklı bölümden birebir (content:iuc-cards).'
const HEADING = /^[-•]?\s*([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü .'’/]{2,60}?)\s*\(([^()]{2,60})\)\s*:?\s*$/
/** A title-case heading line without parenthesis ("Colon Ascendens", "Pancreas", "Komşulukları"). */
const TITLE_HEADING = /^\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,4}$/u
/** Sentences that say where a structure lies. */
const LOCATION_VERBS = 'yer alır|yer almaktadır|bulunur|bulunmaktadır|yerleşmiştir|yerleşir|yerleşimlidir|uzanır|uzanmaktadır|oturur'
const LOCATION = new RegExp(`\\b(${LOCATION_VERBS})\\b`)
const LOCATION_END = new RegExp(`(${LOCATION_VERBS})\\.$`)
const REF_LINE = /^\s*\d+(\s*,\s*\d+)*\s*,?\s*$/
const RUNNING_HEADERS = new Set(['Lokomotor Sistem Anatomisi', 'İç Organlar Anatomisi', 'Nöroanatomi Ders Notları'])
/** Lists, notes and numbered fragments are not prose. */
const LISTLIKE = /^\s*[-–•*]|\s-\s.*\s-\s|^\s*\d+\s*[-.)]\s|\bNOT\s*:|^[A-ZÇĞİÖŞÜ]{3,}\b/
/** Text that ran into the next heading, e.g. "… Encephalon'un Venleri Venae Diploicae Diploik …". */
const HEADING_BLEED = /(\p{Lu}[\p{Ll}'’]+\s+){3,}\p{Lu}/u
const GENERIC_WORDS = new Set(['arteria', 'arteriae', 'vena', 'venae', 'nervus', 'nervi', 'musculus', 'musculi', 'ligamentum', 'ossis', 'glandula', 'lobus', 'pars', 'sağ', 'sol', 'kemiği', 'kemik', 'bezi', 'dexter', 'sinister', 'dextra', 'sinistra'])

/** Word stems (first 5 letters) of the structure's Latin, Turkish and English names. */
function stems(s: Structure): string[] {
  const names = [s.names.la?.value, s.names.tr?.value, s.names.en.value, ...(s.synonyms ?? []).map((x) => x.value)].filter((x): x is string => !!x)
  const words = names.flatMap((n) => n.toLocaleLowerCase('tr').split(/[^\p{L}]+/u)).filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w))
  return [...new Set(words.map((w) => w.slice(0, 5)))]
}
const mentions = (sentence: string, s: Structure) => {
  const low = sentence.toLocaleLowerCase('tr')
  return stems(s).some((st) => low.includes(st))
}
/** Sentences that open with a sub-heading ("İç Görünümü: …") or end in a list number are fragments. */
const usable = (sentence: string) => !/^[^.]{0,30}:/.test(sentence) && !/\d\.$/.test(sentence) && /^\p{Lu}/u.test(sentence) && sentence.length >= 40
/** Case endings that show the first word is not the subject ("Sfenoid kemikte …", "Sağ ventrikül'ün …"). */
const OBLIQUE = /(['’]\p{L}+|[dt][ae]|n[dt][ae]|[nı]?[ıiuü]n)$/u
/**
 * A location sentence either opens with the structure's own name ("Cerebellum beynin altında …
 * yerleşmiştir") or, near the start of its section, leaves the subject out and ends in the
 * location verb ("Sağ ventrikül'ün arka-dışyanında yer alır.").
 */
function isLocation(sentence: string, s: Structure, index: number): boolean {
  if (!usable(sentence) || HEADING_BLEED.test(sentence) || !LOCATION.test(sentence)) return false
  const words = sentence.split(/\s+/).map((w) => w.toLocaleLowerCase('tr'))
  // "Tuba uterina'nın … 4 parçası bulunur": a name in the genitive is not the subject.
  const nameLength = (s.names.la?.value ?? s.names.en.value).split(/\s+/).length
  const nameIsSubject = !words.slice(0, nameLength).some((w) => /['’]/.test(w))
  if (stems(s).includes(words[0]!.slice(0, 5)) && nameIsSubject) return true
  return index < 3 && sentence.length <= 160 && LOCATION_END.test(sentence) && words.slice(0, 2).some((w) => OBLIQUE.test(w))
}
const EXPAND: [RegExp, string][] = [
  [/^m\. /, 'musculus '],
  [/^mm\. /, 'musculi '],
  [/^n\. ?/, 'nervus '],
  [/^nn\. /, 'nervi '],
  [/^a\. /, 'arteria '],
  [/^aa\. /, 'arteriae '],
  [/^v\. /, 'vena '],
  [/^vv\. /, 'venae '],
  [/^lig\. /, 'ligamentum '],
  [/^r\. /, 'ramus '],
  [/^rr\. /, 'rami '],
]

interface Line {
  text: string
  page: number
  sourceId: string
}

async function main(): Promise<number> {
  const lines: Line[] = []
  const pagesBySource = new Map<string, BookPage[]>()
  for (const b of IUC_BOOKS) {
    let pages: BookPage[]
    try {
      pages = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'iuc', `${b.file}.pages.json`), 'utf8')) as { pages: BookPage[] }).pages
    } catch {
      console.error('İÜC sayfa metinleri yok; önce "npm run content:iuc" çalıştırın.')
      return 1
    }
    pagesBySource.set(b.sourceId, pages)
    for (const p of pages) {
      // Chapter openers carry authors, licence and a bilingual abstract, not anatomy text.
      if (p.printed === null || /Bu bölümü alıntıla|Cite this chapter/.test(p.text)) continue
      for (const t of p.text.split('\n')) {
        if (/^\s*\d+\s*$/.test(t) || RUNNING_HEADERS.has(t.trim())) continue
        lines.push({ text: t, page: p.printed, sourceId: b.sourceId })
      }
    }
  }

  const ta2 = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8')) as { data: Ta2Term[] }).data
  const ta2ByLatin = new Map<string, number[]>()
  for (const t of ta2) for (const la of [t.term.la, ...(t.synonyms?.la ?? [])]) if (la) ta2ByLatin.set(latinKey(la), [...(ta2ByLatin.get(latinKey(la)) ?? []), t.id])
  const expand = (s: string) => {
    let k = latinKey(s.replace(/[’']\p{L}*$/u, '').replace(/\s*\/.*$/, ''))
    for (const [re, full] of EXPAND) k = k.replace(re, full)
    return k
  }
  const { content } = await loadContent(pathsFromArgs())
  const byTa2 = new Map<string, Structure[]>()
  for (const s of content.structures) if (s.externalIds.ta2) byTa2.set(s.externalIds.ta2, [...(byTa2.get(s.externalIds.ta2) ?? []), s])
  const targetsFor = (latin: string): Structure[] => {
    const found = (ta2ByLatin.get(latin) ?? []).flatMap((id) => byTa2.get(String(id)) ?? [])
    const primary = found.filter((s) => !((s.laterality === 'right' || s.laterality === 'left') && s.genericId))
    return primary.length > 0 ? primary : found
  }

  // Headings with the Latin term on either side of the parenthesis.
  interface Block {
    latin: string
    start: number
    end: number
  }
  const blocks: Block[] = []
  lines.forEach((l, i) => {
    const t = l.text.trim()
    const m = HEADING.exec(t)
    if (!m && !(t.length <= 50 && TITLE_HEADING.test(t))) return
    const [left, right] = m ? [expand(m[1]!), expand(m[2]!)] : [expand(t), '']
    const latin = ta2ByLatin.has(left) ? left : ta2ByLatin.has(right) ? right : null
    if (latin) blocks.push({ latin, start: i + 1, end: lines.length })
    else blocks.push({ latin: '', start: i + 1, end: lines.length }) // other headings still end the previous block
  })
  for (let i = 0; i < blocks.length - 1; i++) blocks[i]!.end = blocks[i + 1]!.start - 1

  // Hand review (content/terminology/iuc-kart-dislama.json): structures whose automatically chosen
  // sentences do not describe them, and structures whose description runs into the next heading.
  const review = JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'iuc-kart-dislama.json'), 'utf8').catch(() => '{}')) as {
    yapilar?: Record<string, string>
    yalnizOzet?: Record<string, string>
    konumYok?: Record<string, string>
  }
  const excluded = review.yapilar ?? {}
  const summaryOnly = review.yalnizOzet ?? {}
  const noLocation = review.konumYok ?? {}
  const overlays = new Map<string, Record<string, unknown>>()
  for (const b of blocks) {
    if (!b.latin) continue
    const body = lines.slice(b.start, b.end).filter((l) => !REF_LINE.test(l.text))
    if (body.length === 0) continue
    // Stay within one book and at most a few pages from the heading.
    const same = body.filter((l) => l.sourceId === body[0]!.sourceId && l.page <= body[0]!.page + 2)
    const text = normalizeForQuote(same.map((l) => l.text).join('\n'))
    const sentences = splitSentences(text).filter((s) => /[.!?]$/.test(s) && s.length >= 25)
    if (sentences.length === 0) continue
    // Keep sentences that occur verbatim on a single page (so every quote can be checked).
    const bookPages = pagesBySource.get(same[0]!.sourceId)!
    const candidatePages = [...new Set(same.map((l) => l.page))]
    const items = sentences.map((sentence) => ({ sentence, page: candidatePages.find((p) => quoteOccurs(bookPages, [p], sentence)) }))
    const located = items.filter((x): x is { sentence: string; page: number } => x.page !== undefined)
    if (located.length === 0) continue
    const src = (parts: { sentence: string; page: number }[]) => {
      const from = Math.min(...parts.map((p) => p.page))
      const to = Math.max(...parts.map((p) => p.page))
      return { sourceId: same[0]!.sourceId, locator: to > from ? `s. ${from}-${to}` : `s. ${from}`, quote: parts.map((p) => p.sentence).join(' … ') }
    }
    const prose = located.filter((x) => !LISTLIKE.test(x.sentence))
    for (const t of targetsFor(b.latin)) {
      if (t.id in excluded) continue
      // The summary is the first sentence that names the structure; the description follows it
      // until the text runs into the next heading (a run of capitalised words).
      // The location is the first sentence that names the structure and says where it lies; it is
      // not repeated as summary or description.
      const where = t.id in noLocation ? undefined : prose.find((x, i) => isLocation(x.sentence, t, i))
      const summary = prose.find((x) => x !== where && usable(x.sentence) && mentions(x.sentence, t))
      if (!summary && !where) continue
      // The description is the run of sentences right after the summary: it stops at the first
      // sentence that cannot be quoted, is a list or fragment, or runs into the next heading, so no
      // sentence is left out from the middle (which would break references such as "Burası …").
      const rest: { sentence: string; page: number }[] = []
      for (const x of summary ? items.slice(items.findIndex((i) => i.sentence === summary.sentence) + 1) : []) {
        if (x.sentence === where?.sentence) continue
        if (x.page === undefined || LISTLIKE.test(x.sentence) || !usable(x.sentence) || HEADING_BLEED.test(x.sentence)) break
        if (rest.map((r) => r.sentence).join(' ').length + x.sentence.length > 700) break
        rest.push({ sentence: x.sentence, page: x.page })
      }
      // A field counts as written unless it came from this generator (re-runs regenerate it).
      const has = (f: 'summary' | 'description' | 'location') => {
        const cur = t.content[f]
        return cur?.status === 'present' && !cur.sources.some((r) => r.note === MARK)
      }
      if (overlays.has(t.id)) continue // the first heading of a structure wins
      const fields: Record<string, unknown> = {}
      const entry = (parts: { sentence: string; page: number }[]) => ({
        status: 'present',
        value: parts.map((p) => p.sentence).join(' ').replace(/›/g, "'"),
        verification: 'unverified',
        sources: [{ ...src(parts), note: MARK }],
      })
      if (summary && !has('summary')) fields.summary = entry([summary])
      if (where && !has('location')) fields.location = entry([where])
      if (!has('description') && rest.length > 0 && !(t.id in summaryOnly)) fields.description = entry(rest)
      if (Object.keys(fields).length > 0) overlays.set(t.id, { id: t.id, content: fields })
    }
  }

  await mkdir(join(CONTENT_DIR, 'structures', 'iuc'), { recursive: true })
  const out = [...overlays.values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  await writeFile(join(CONTENT_DIR, OUT), prettyJson(out))
  console.log(`Kitap başlığı: ${blocks.filter((b) => b.latin).length} (TA2 ile eşleşen); özet/açıklama yazılan yapı: ${out.length} → content/${OUT}`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Bilgi kartları üretilemedi:', e)
    process.exitCode = 1
  },
)
