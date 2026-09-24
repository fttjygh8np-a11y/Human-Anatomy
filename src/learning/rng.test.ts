import { describe, expect, it } from 'vitest'
import { createRng, hashSeed, mulberry32, pick, randomInt, sample, shuffle } from './rng.ts'

const take = (rng: () => number, n: number) => Array.from({ length: n }, () => rng())

describe('rng', () => {
  it('is deterministic per seed and differs between seeds', () => {
    expect(take(createRng(42), 5)).toEqual(take(createRng(42), 5))
    expect(take(createRng(42), 5)).not.toEqual(take(createRng(43), 5))
    expect(take(createRng(42, 'a'), 3)).not.toEqual(take(createRng(42, 'b'), 3))
  })

  it('produces floats in [0, 1)', () => {
    for (const x of take(mulberry32(1), 1000)) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('accepts negative, fractional and string seeds', () => {
    expect(take(createRng(-3.5), 3)).toEqual(take(createRng(-3.5), 3))
    expect(take(createRng('paylaşılan-sınav'), 3)).toEqual(take(createRng('paylaşılan-sınav'), 3))
    expect(hashSeed('x')).not.toBe(hashSeed('y'))
  })

  it('randomInt stays within bounds', () => {
    const rng = createRng(7)
    for (let i = 0; i < 500; i++) {
      const v = randomInt(rng, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(3)
    }
    expect(randomInt(rng, 0)).toBe(0)
  })

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(input, createRng(1))
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...out].sort()).toEqual(input)
    expect(shuffle(input, createRng(1))).toEqual(out)
  })

  it('sample returns distinct items and handles edge cases', () => {
    const s = sample(['a', 'b', 'c', 'd'], 2, createRng(9))
    expect(s).toHaveLength(2)
    expect(new Set(s).size).toBe(2)
    expect(sample(['a'], 5, createRng(9))).toEqual(['a'])
    expect(sample(['a'], 0, createRng(9))).toEqual([])
    expect(pick([], createRng(1))).toBeUndefined()
    expect(['x', 'y']).toContain(pick(['x', 'y'], createRng(1)))
  })
})
