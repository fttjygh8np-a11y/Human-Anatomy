/**
 * Text normalization for typed answers and name de-duplication.
 *
 *  - Turkish-aware case folding: İ/I/ı/i all fold to "i" (learners type on different keyboards).
 *  - Diacritics are removed (ş→s, ğ→g, ç→c, ö→o, ü→u, â→a …) and Latin ligatures expanded (æ→ae).
 *  - Punctuation is ignored; apostrophes join ("Douglas'ın" → "douglasin"), hyphens split.
 *  - Common Terminologia Anatomica abbreviations with a period are expanded (m. → musculus).
 *
 * Laterality words are detected token-wise so the grader can require the correct side
 * without confusing names that contain a side word intrinsically (e.g. "atrium dextrum").
 */

const LIGATURES: Record<string, string> = { æ: 'ae', œ: 'oe', ß: 'ss', ø: 'o', đ: 'd', ł: 'l' }

/** Case- and diacritic-insensitive folding with Turkish dotted/dotless i handling. */
export function foldText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/[æœßøđł]/g, (c) => LIGATURES[c] ?? c)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
}

/** Abbreviations used in Latin anatomical names (only expanded when written with a period). */
const LATIN_ABBREVIATIONS: Record<string, string> = {
  m: 'musculus',
  mm: 'musculi',
  a: 'arteria',
  aa: 'arteriae',
  v: 'vena',
  vv: 'venae',
  n: 'nervus',
  nn: 'nervi',
  lig: 'ligamentum',
  ligg: 'ligamenta',
  r: 'ramus',
  rr: 'rami',
}

/** Normalized token list of a free-text answer or name. */
export function answerTokens(input: string): string[] {
  const folded = foldText(input)
    .replace(/['’‘`´]/g, '')
    .replace(/\.(?=\p{L})/gu, '. ')
  const out: string[] = []
  for (const raw of folded.split(/\s+/)) {
    if (!raw) continue
    const abbr = /^([a-z]+)\.$/.exec(raw)
    const expanded = abbr?.[1] !== undefined ? LATIN_ABBREVIATIONS[abbr[1]] : undefined
    const token = expanded ?? raw
    for (const part of token.split(/[^\p{L}\p{N}]+/u)) if (part) out.push(part)
  }
  return out
}

/** Normalized single-string form ("M. Biceps-Brachii" → "musculus biceps brachii"). */
export function normalizeAnswer(input: string): string {
  return answerTokens(input).join(' ')
}

export type Side = 'right' | 'left'

const SIDE_WORDS: Record<string, Side> = {
  // Turkish (folded)
  sag: 'right',
  sagdaki: 'right',
  sol: 'left',
  soldaki: 'left',
  // English
  right: 'right',
  left: 'left',
  // Latin
  dexter: 'right',
  dextra: 'right',
  dextrum: 'right',
  dextri: 'right',
  dextrae: 'right',
  sinister: 'left',
  sinistra: 'left',
  sinistrum: 'left',
  sinistri: 'left',
  sinistrae: 'left',
}

/** Filler words that only accompany a side word ("sağ taraftaki …", "right-sided …"). */
const SIDE_FILLER = new Set(['taraf', 'tarafi', 'taraftaki', 'tarafta', 'side', 'sided'])

export function sideOfToken(token: string): Side | undefined {
  return SIDE_WORDS[token]
}

/** Side words in a token list: the detected side ('both' when contradictory) and the remaining tokens. */
export function extractSide(tokens: readonly string[]): { side: Side | 'both' | null; rest: string[] } {
  const sides = new Set<Side>()
  const rest: string[] = []
  for (const t of tokens) {
    const s = SIDE_WORDS[t]
    if (s) sides.add(s)
    else rest.push(t)
  }
  const side = sides.size === 0 ? null : sides.size > 1 ? 'both' : ([...sides][0] as Side)
  return { side, rest: side ? rest.filter((t) => !SIDE_FILLER.has(t)) : rest }
}

/** Whether a (display) name already states a side. */
export function nameStatesSide(name: string): boolean {
  return answerTokens(name).some((t) => SIDE_WORDS[t] !== undefined)
}

/**
 * Optimal-string-alignment (Damerau–Levenshtein) distance; stops early and returns
 * `max + 1` as soon as the distance is known to exceed `max`.
 */
export function editDistance(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const n = b.length
  let prevPrev: number[] = []
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, (prevPrev[j - 2] as number) + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = cur
  }
  return prev[n] as number
}

/** Words shorter than this must be typed exactly; longer words tolerate one edit. */
export const TYPO_MIN_WORD_LENGTH = 6

export type TokenMatch = 'exact' | 'typo' | 'none'

/**
 * Compare an answer with one accepted form, word by word. Words of ≥ 6 characters tolerate
 * one edit (insertion, deletion, substitution or transposition); shorter words must match.
 * Spacing/hyphenation differences are accepted when the letters are identical.
 */
export function matchTokens(answer: readonly string[], expected: readonly string[]): TokenMatch {
  if (answer.length === 0 || expected.length === 0) return 'none'
  if (answer.length === expected.length) {
    let typo = false
    for (let i = 0; i < expected.length; i++) {
      const a = answer[i] as string
      const e = expected[i] as string
      if (a === e) continue
      if (e.length >= TYPO_MIN_WORD_LENGTH && editDistance(a, e, 1) <= 1) {
        typo = true
        continue
      }
      return 'none'
    }
    return typo ? 'typo' : 'exact'
  }
  return answer.join('') === expected.join('') ? 'exact' : 'none'
}
