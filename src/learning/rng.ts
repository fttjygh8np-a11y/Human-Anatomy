/**
 * Seeded, deterministic pseudo-random numbers for question generation.
 * The same seed always yields the same quiz (tests, shareable exams).
 */

/** Uniform float in [0, 1). */
export type Rng = () => number

/** mulberry32: small, fast 32-bit PRNG with good statistical quality for this purpose. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a 32-bit hash of the given parts; used to turn any seed (or seed + label) into a PRNG seed. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5
  const text = parts.map(String).join('\u0000')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** PRNG for a seed (any number or string; floats and negatives are accepted). */
export function createRng(seed: number | string, ...labels: (string | number)[]): Rng {
  return mulberry32(hashSeed(seed, ...labels))
}

/** Integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive))
}

/** Fisher–Yates shuffle into a new array (input is not modified). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}

/** Up to `n` distinct items in random order. */
export function sample<T>(items: readonly T[], n: number, rng: Rng): T[] {
  if (n <= 0) return []
  return shuffle(items, rng).slice(0, n)
}

/** One random item, or undefined for an empty list. */
export function pick<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined
  return items[randomInt(rng, items.length)]
}
