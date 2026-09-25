/**
 * Text normalization for search (Turkish-aware, diacritic-insensitive).
 *
 *  1. Turkish-locale lowercasing: İ -> i, I -> ı (so "İNCE" and "ince" meet).
 *  2. Folding: ı -> i, ş -> s, ğ -> g, ç -> c, ö -> o, ü -> u, plus every Latin/English
 *     diacritic via NFD + removal of combining marks (é -> e, ä -> a, ...), and a few
 *     ligatures/special letters (æ -> ae, œ -> oe, ß -> ss, ø -> o, ł -> l, đ -> d).
 *
 * As a consequence "kas", "KAS" and "kaş" normalize to the same term, and so do
 * "humerus" and "hümerus". This is intentional: search is tolerant, display is not.
 */

const SPECIAL_LETTERS: Record<string, string> = {
  ı: 'i',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
}
const SPECIAL_RE = /[ıæœßøłđðþ]/g
const COMBINING_MARKS_RE = /\p{M}+/gu
const NON_WORD_RE = /[^\p{L}\p{N}]+/u

function lowerTr(text: string): string {
  try {
    return text.toLocaleLowerCase('tr-TR')
  } catch {
    // Runtimes without locale data: emulate the two Turkish-specific mappings.
    return text.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase()
  }
}

/** Normalizes a free text for matching (keeps spacing/punctuation; see tokenize). */
export function normalizeSearchText(text: string): string {
  return lowerTr(text)
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(SPECIAL_RE, (ch) => SPECIAL_LETTERS[ch] ?? ch)
    .normalize('NFC')
}

/** Normalizes and splits into terms (letters/digits only; punctuation and apostrophes split). */
export function tokenize(text: string): string[] {
  return normalizeSearchText(text).split(NON_WORD_RE).filter((t) => t.length > 0)
}

/** Normalized terms joined by single spaces (phrase comparison key). */
export function phraseKey(text: string): string {
  return tokenize(text).join(' ')
}

// ---------------------------------------------------------------------------
// Side words (query understanding)
// ---------------------------------------------------------------------------

/** Normalized side words (Turkish, English, Latin adjective forms). */
export const SIDE_WORDS: Readonly<Record<'left' | 'right', readonly string[]>> = {
  left: ['sol', 'left', 'sinister', 'sinistra', 'sinistrum', 'sinistri', 'sinistrae'],
  right: ['sag', 'right', 'dexter', 'dextra', 'dextrum', 'dextri', 'dextrae'],
}

const SIDE_OF = new Map<string, 'left' | 'right'>([
  ...SIDE_WORDS.left.map((w) => [w, 'left'] as const),
  ...SIDE_WORDS.right.map((w) => [w, 'right'] as const),
])

export function sideOfTerm(term: string): 'left' | 'right' | undefined {
  return SIDE_OF.get(term)
}

// ---------------------------------------------------------------------------
// Edit distance
// ---------------------------------------------------------------------------

/**
 * Optimal-string-alignment distance (Levenshtein + adjacent transposition), bounded:
 * returns `max + 1` as soon as the distance is known to exceed `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const n = b.length
  let prevPrev = new Array<number>(n + 1).fill(0)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let cur = new Array<number>(n + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2]! + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    ;[prevPrev, prev, cur] = [prev, cur, prevPrev]
  }
  const d = prev[n]!
  return d > max ? max + 1 : d
}

/** Maximum typo distance tolerated for a query term of the given length. */
export function maxTypos(termLength: number): number {
  if (termLength < 4) return 0
  if (termLength < 6) return 1
  return 2
}
