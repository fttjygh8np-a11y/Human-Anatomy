/**
 * `npm run content:iuc-cards` — info-card text (summary, description) for bones, organs and
 * nervous-system structures from the three İÜC textbooks (CC BY 4.0).
 *
 * The books introduce a structure with a heading line such as "- Humerus (Kol kemiği):",
 * "Os Frontale (Alın Kemiği)" or "Mesencephalon (Orta Beyin)" followed by prose. A heading whose
 * Latin side is a TA2 term (abbreviations "M./N./A./V./Lig." expanded) is matched to structures;
 * from the prose, the first sentence becomes the summary and the next sentences (up to ~700
 * characters) the description, each verbatim with page and quote (content:quotecheck).
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
    const m = HEADING.exec(l.text.trim())
    if (!m) return
    const [left, right] = [expand(m[1]!), expand(m[2]!)]
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
  }
  const excluded = review.yapilar ?? {}
  const summaryOnly = review.yalnizOzet ?? {}
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
    const located = sentences
      .map((sentence) => ({ sentence, page: candidatePages.find((p) => quoteOccurs(bookPages, [p], sentence)) }))
      .filter((x): x is { sentence: string; page: number } => x.page !== undefined)
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
      const at = prose.findIndex((x) => mentions(x.sentence, t))
      if (at < 0) continue
      const summary = prose[at]!
      const rest: { sentence: string; page: number }[] = []
      for (const x of prose.slice(at + 1)) {
        if (HEADING_BLEED.test(x.sentence) || rest.map((r) => r.sentence).join(' ').length + x.sentence.length > 700) break
        rest.push(x)
      }
      // A field counts as written unless it came from this generator (re-runs regenerate it).
      const has = (f: 'summary' | 'description') => {
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
      if (!has('summary')) fields.summary = entry([summary])
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
