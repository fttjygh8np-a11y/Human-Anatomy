/**
 * İÜC (İstanbul Üniversitesi-Cerrahpaşa) open textbooks used as the Dönem 1–2 curriculum source
 * (CC BY 4.0, licence read from each book's imprint page; see content/sources/iuc-*.json).
 *
 * Pure helpers: book catalogue, printed-page detection, text normalisation for quote checks and
 * locator parsing. Downloading and PDF text extraction live in scripts/content/iuc.ts.
 */

export interface IucBook {
  /** Source id in content/sources. */
  sourceId: string
  /** File stem under vendor/iuc/. */
  file: string
  downloadId: number
  /** sha256 of the PDF read on 2026-09-25; a different file is refused (re-verify the licence first). */
  sha256: string
}

export const IUC_BOOKS: readonly IucBook[] = [
  {
    sourceId: 'src:iuc-lokomotor',
    file: 'lokomotor-sistem-anatomisi',
    downloadId: 30,
    sha256: '2f0974b99bdb0047e0a062b42f5eb2f9e8515ce34097e130afab207689d77ee2',
  },
  {
    sourceId: 'src:iuc-ic-organlar',
    file: 'ic-organlar-anatomisi',
    downloadId: 47,
    sha256: 'b8ef9b2c5cd3b0986404e9cb3d7c3b7eac527fef24172026f4c5969bb9d90b0d',
  },
  {
    sourceId: 'src:iuc-noroanatomi',
    file: 'noroanatomi-ders-notlari',
    downloadId: 70,
    sha256: 'a1f96dccd335c0c941834f84426659ae9589d05f404d1856c267e2dcbf0bb34d',
  },
]

export const iucDownloadUrl = (b: IucBook) => `https://www.iuc-universitypress.org/index.php?route=product/download&download_id=${b.downloadId}`

export interface BookPage {
  /** 1-based page index in the PDF. */
  pdfPage: number
  /** Printed page number (arabic) when known; null for unnumbered/front-matter pages. */
  printed: number | null
  /** Text as extracted, lines separated by \n. */
  text: string
}

/** Printed arabic page number from the first non-empty line of a page (e.g. "5"), else null. */
export function printedNumberOf(text: string): number | null {
  const first = text.split('\n').find((l) => l.trim() !== '')
  const m = first ? /^\s*(\d{1,4})\s*$/.exec(first) : null
  return m ? Number(m[1]) : null
}

/**
 * Assigns printed numbers to every page: pages without a visible number (chapter title pages)
 * get the number implied by the most common pdfPage→printed offset, if the offset is unambiguous.
 */
export function assignPrinted(pages: { pdfPage: number; text: string }[]): BookPage[] {
  const seen = pages.map((p) => ({ ...p, printed: printedNumberOf(p.text) }))
  const offsets = new Map<number, number>()
  for (const p of seen) if (p.printed !== null) offsets.set(p.pdfPage - p.printed, (offsets.get(p.pdfPage - p.printed) ?? 0) + 1)
  const best = [...offsets.entries()].sort((a, b) => b[1] - a[1])[0]
  return seen.map((p) => ({
    pdfPage: p.pdfPage,
    text: p.text,
    printed: p.printed ?? (best && p.pdfPage - best[0] >= 1 ? p.pdfPage - best[0] : null),
  }))
}

/**
 * Normalisation shared by the page text and the quotes checked against it: Unicode NFC, typographic
 * quotes/apostrophes/dashes unified, reference-number lines (superscript citation markers such as
 * "1, 2, 3, 4,") dropped, words hyphenated across a line break joined, whitespace collapsed.
 */
export function normalizeForQuote(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .filter((l) => !/^\s*\d+(\s*,\s*\d+)*\s*,?\s*$/.test(l))
    .join('\n')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Printed page numbers named by a locator such as "Bölüm 1.1, s. 5" or "s. 5-6". */
export function pagesOfLocator(locator: string | undefined): number[] {
  const m = locator ? /\bs\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/.exec(locator) : null
  if (!m) return []
  const from = Number(m[1])
  const to = m[2] ? Number(m[2]) : from
  if (to < from || to - from > 10) return [from]
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

/**
 * True when `quote` occurs in the text of the given printed pages (joined, so a quote may run over
 * a page break). Both sides are normalised with normalizeForQuote; "…" in the quote marks an
 * omission and each part must appear in order.
 */
export function quoteOccurs(pages: BookPage[], printed: number[], quote: string): boolean {
  const hay = normalizeForQuote(
    pages
      .filter((p) => p.printed !== null && printed.includes(p.printed))
      .sort((a, b) => a.pdfPage - b.pdfPage)
      .map((p) => p.text)
      .join('\n'),
  )
  if (!hay) return false
  let from = 0
  for (const part of quote.split('…').map((q) => normalizeForQuote(q)).filter(Boolean)) {
    const at = hay.indexOf(part, from)
    if (at < 0) return false
    from = at + part.length
  }
  return true
}

// ---------------------------------------------------------------------------------------------
// Term pairs: the books write terms as "Latin (Türkçe)" or "Türkçe (Latin)", e.g.
// "Clavicula (Köprücük kemiği)". A pair is kept when one side is a TA2 Latin term (longest
// matching word suffix) and the other looks like a short Turkish noun phrase. Candidates are then
// curated by hand (content/terminology/iuc-dislama.json lists rejected pairs with a reason).
// ---------------------------------------------------------------------------------------------

export interface TermPair {
  /** Latin term as a TA2 key (lower case). */
  latin: string
  /** Turkish term as written in the book (trimmed). */
  tr: string
  sourceId: string
  printed: number
  /** Exact text of the pair on the page, e.g. "Clavicula (Köprücük kemiği)". */
  quote: string
}

const TR_LETTERS = /[çğıöşüÇĞİÖŞÜ]/
const WORD = "[A-Za-zÇĞİÖŞÜçğıöşüâîû'’\\-]+"

/** Plausible Turkish name: 1–5 words, letters only, not itself a Latin (TA2) term. */
export function looksTurkishName(s: string, latinTerms: ReadonlySet<string>): boolean {
  const t = s.trim()
  if (!t || /\d/.test(t) || t.length > 60) return false
  const words = t.split(/\s+/)
  if (words.length > 5 || !words.every((w) => new RegExp(`^${WORD}$`).test(w))) return false
  if (latinTerms.has(t.toLocaleLowerCase('tr').replace(/i̇/g, 'i'))) return false
  // Turkish letters or a typical Turkish noun ending (possessive/plural) on the last word.
  return TR_LETTERS.test(t) || /(ı|i|u|ü|lar|ler|ları|leri)$/i.test(words.at(-1)!)
}

/** Lower-case key for Latin terms (Turkish dotted/dotless i folded). */
export const latinKey = (s: string) => s.toLocaleLowerCase('en').replace(/i̇/g, 'i').replace(/\s+/g, ' ').trim()

export function extractTermPairs(sourceId: string, pages: BookPage[], latinTerms: ReadonlySet<string>): TermPair[] {
  const out: TermPair[] = []
  const re = new RegExp(`((?:${WORD} ){0,6}${WORD})\\s*\\(([^()\\n]{2,60})\\)`, 'g')
  for (const p of pages) {
    if (p.printed === null) continue
    const text = normalizeForQuote(p.text)
    for (const m of text.matchAll(re)) {
      const before = m[1]!.split(' ')
      const inside = m[2]!.trim()
      // Latin (Türkçe): longest word suffix of `before` that is a TA2 term.
      for (let k = Math.min(6, before.length); k >= 1; k--) {
        const latinWords = before.slice(-k).join(' ').replace(/['’](\p{L})+$/u, '')
        if (latinTerms.has(latinKey(latinWords)) && looksTurkishName(inside, latinTerms)) {
          out.push({ latin: latinKey(latinWords), tr: inside, sourceId, printed: p.printed, quote: `${before.slice(-k).join(' ')} (${m[2]})` })
          break
        }
      }
      // Türkçe (Latin): the parenthesis holds a TA2 term; take the shortest Turkish-looking suffix before it.
      if (latinTerms.has(latinKey(inside))) {
        for (let k = 1; k <= Math.min(5, before.length); k++) {
          const tr = before.slice(-k).join(' ')
          if (!looksTurkishName(tr, latinTerms)) continue
          // Prefer the longest suffix that is still a Turkish-looking phrase (e.g. "Kalça kemiği").
          let best = tr
          for (let j = k + 1; j <= Math.min(5, before.length); j++) {
            const longer = before.slice(-j).join(' ')
            if (looksTurkishName(longer, latinTerms) && /^\p{Lu}/u.test(longer)) best = longer
          }
          out.push({ latin: latinKey(inside), tr: best, sourceId, printed: p.printed, quote: `${best} (${m[2]})` })
          break
        }
      }
    }
  }
  return out
}

// ---- Muscle descriptions ("M. x:" blocks with Başlangıcı / Sonlanışı / İşlevi / Siniri) ----

export type MuscleLabel = 'Başlangıcı' | 'Sonlanışı' | 'İşlevi' | 'Siniri'
export interface MuscleLine {
  text: string
  page: number
}
export interface MuscleField {
  label: MuscleLabel | 'summary'
  lines: MuscleLine[]
}
export interface MuscleBlock {
  name: string
  page: number
  fields: MuscleField[]
}

const MUSCLE_HEADER = /^\s*Mm?\.\s+([a-z][a-z .-]+?)\s*:\s*(.*)$/i
const MUSCLE_LABEL = /^\s*(Başlangıcı|Sonlanışı|İşlevi|Siniri)\s*:\s*(.*)$/
/** Lines that end a field: citation-number lines, section headings, enumerations. */
const MUSCLE_STOP = /^\s*(\d+(\s*,\s*\d+)*\s*,?\s*$|[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ .-]{3,}:|\d+\.\s|[A-Z]\)\s|BÖLÜM\b)/

export function parseMuscleBlocks(lines: MuscleLine[]): MuscleBlock[] {
  const blocks: MuscleBlock[] = []
  let cur: MuscleBlock | null = null
  let field: MuscleField | null = null
  for (const l of lines) {
    const h = MUSCLE_HEADER.exec(l.text)
    if (h) {
      cur = { name: h[1]!.trim().toLowerCase(), page: l.page, fields: [] }
      blocks.push(cur)
      field = h[2]?.trim() ? { label: 'summary', lines: [{ text: h[2].trim(), page: l.page }] } : null
      if (field) cur.fields.push(field)
      continue
    }
    if (!cur) continue
    const m = MUSCLE_LABEL.exec(l.text)
    if (m) {
      field = { label: m[1] as MuscleLabel, lines: [l] }
      cur.fields.push(field)
      continue
    }
    if (MUSCLE_STOP.test(l.text)) {
      field = null
      continue
    }
    if (field) field.lines.push(l)
    else if (cur.fields.length === 0) {
      field = { label: 'summary', lines: [l] }
      cur.fields.push(field)
    }
  }
  return blocks
}

/** Sentences of normalised book text (a sentence ends with . ! ? before a capital letter). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
