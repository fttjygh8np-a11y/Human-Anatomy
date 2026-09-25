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
