/**
 * Build configuration for `npm run models:build`.
 *
 * Defaults are starting values chosen before any real BodyParts3D build or device measurement
 * could be made (the source host is unreachable from the development environment). Tune them with
 * a JSON override (`--config path.json`, deep-merged) after profiling on the reference device.
 */
import { readFileSync } from 'node:fs'
import { z } from 'zod'

export const protectedRuleSchema = z.object({
  /** Case-insensitive regular expression tested against the element's English name. */
  pattern: z.string().min(1),
  /** Why the element must not be simplified (shown in the build report). */
  reason: z.string().min(1),
})

export const modelBuildConfigSchema = z.object({
  /** Vertices closer than this (metres, grid-snapped) are merged; 0 = exact duplicates only. */
  weldToleranceM: z.number().nonnegative(),
  lod: z.object({
    base: z.object({
      /** Triangle budget per chunk GLB unless overridden in chunkBudgets. */
      defaultTriangleBudget: z.number().int().positive(),
      /** Per-chunk budgets, keyed by chunk ("skeletal/upper_limb"). */
      chunkBudgets: z.record(z.string(), z.number().int().positive()),
      /** Floor per non-protected element so small elements never disappear. */
      minTrianglesPerElement: z.number().int().positive(),
      /** meshoptimizer target error bound, relative to each element's extent. */
      maxError: z.number().positive(),
      /**
       * If a simplified element's bbox diagonal shrinks below this fraction of the original, the
       * element is kept at full resolution in the base LOD (and the check is recorded).
       */
      minBboxRatio: z.number().min(0).max(1),
    }),
    detail: z.object({
      enabled: z.boolean(),
      /** null = keep full (welded) source resolution. */
      maxTrianglesPerElement: z.number().int().positive().nullable(),
      maxError: z.number().positive(),
    }),
  }),
  /** Elements never simplified (flagged protectedFromSimplification). */
  protected: z.array(protectedRuleSchema),
  /** FMA ids (digits) that are always protected, in addition to the name patterns. */
  protectedFmaIds: z.array(z.string().regex(/^\d+$/)),
  quantization: z.object({
    position: z.number().int().min(8).max(16),
    normal: z.number().int().min(4).max(16),
  }),
  meshoptLevel: z.enum(['medium', 'high']),
  midline: z.object({
    /** Fixed midline X (app frame, metres) instead of measuring it from left/right pairs. */
    xOverrideM: z.number().nullable(),
    /** Centroids closer than this to the midline count as "on the midline". */
    toleranceM: z.number().nonnegative(),
  }),
  /** Include elements whose OBJ header has no FMA id (structure id `ax:bp3d-FJ…`). */
  includeElementsWithoutFma: z.boolean(),
})
export type ModelBuildConfig = z.infer<typeof modelBuildConfigSchema>

export const DEFAULT_CONFIG: ModelBuildConfig = {
  weldToleranceM: 0,
  lod: {
    base: {
      defaultTriangleBudget: 150_000,
      chunkBudgets: {
        'skeletal/head': 250_000,
        'nervous/head': 250_000,
        'muscular/head': 200_000,
      },
      minTrianglesPerElement: 200,
      maxError: 0.02,
      minBboxRatio: 0.9,
    },
    detail: { enabled: true, maxTrianglesPerElement: null, maxError: 0.005 },
  },
  // Starting list (engineering choice, pending anatomy-expert review): small structures that are
  // commonly asked about and would lose their shape under aggressive simplification.
  protected: [
    { pattern: '\\b(malleus|incus|stapes|auditory ossicles?)\\b', reason: 'İşitme kemikçikleri (çok küçük)' },
    { pattern: '\\b(cochlea|semicircular (canal|duct)s?|vestibule of (the )?(inner ear|labyrinth))\\b', reason: 'İç kulak yapıları (çok küçük)' },
    { pattern: '\\b(pituitary gland|hypophysis|pineal (body|gland))\\b', reason: 'Küçük endokrin bezler' },
    { pattern: '\\b(parathyroid gland)\\b', reason: 'Küçük endokrin bezler' },
    { pattern: '\\b(trochlear|abducens) nerve\\b', reason: 'İnce kraniyal sinirler' },
    { pattern: '\\bchorda tympani\\b', reason: 'İnce sinir dalı' },
    { pattern: '\\b(lens|cornea)\\b', reason: 'Göz iç yapıları (küçük)' },
  ],
  protectedFmaIds: [],
  quantization: { position: 14, normal: 10 },
  meshoptLevel: 'high',
  midline: { xOverrideM: null, toleranceM: 0.002 },
  includeElementsWithoutFma: false,
}

type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) out[k] = k in base ? deepMerge(base[k], v) : v
  return out
}

/** Defaults deep-merged with an override (arrays and records are replaced/merged key-wise). */
export function resolveConfig(override?: DeepPartial<ModelBuildConfig> | null): ModelBuildConfig {
  return modelBuildConfigSchema.parse(deepMerge(DEFAULT_CONFIG, override ?? {}))
}

export function loadConfigFile(path: string): ModelBuildConfig {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as DeepPartial<ModelBuildConfig>
  return resolveConfig(raw)
}
