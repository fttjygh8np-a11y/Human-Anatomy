/**
 * Loads the compiled content bundle (public/data/*.json, see DATA_FILES) and validates
 * every file with the core schemas. Errors are reported in Turkish and say whether a
 * retry can help (network/server problems) or the deployed data itself is broken.
 */
import { z } from 'zod'
import trLocale from 'zod/v4/locales/tr.js'
import {
  SCHEMA_VERSION,
  assetSchema,
  contentManifestSchema,
  lessonSchema,
  questionSchema,
  regionRecordSchema,
  relationSchema,
  reviewRecordSchema,
  scopeTargetSchema,
  sourceSchema,
  structureSchema,
  systemRecordSchema,
} from '../core/schema.ts'
import { DATA_FILES, type ContentBundle } from './types.ts'

export const taxonomyFileSchema = z.object({
  systems: z.array(systemRecordSchema),
  regions: z.array(regionRecordSchema),
})

/** assets.json is written by the model pipeline: a plain array, or `{ "assets": [...] }`. */
export const assetsFileSchema = z.union([
  z.array(assetSchema),
  z.object({ assets: z.array(assetSchema) }).transform((v) => v.assets),
])

/** Schema of every file in DATA_FILES (also used by the build to self-check its output). */
export const DATA_FILE_SCHEMAS = {
  manifest: contentManifestSchema,
  taxonomy: taxonomyFileSchema,
  structures: z.array(structureSchema),
  relations: z.array(relationSchema),
  sources: z.array(sourceSchema),
  assets: assetsFileSchema,
  lessons: z.array(lessonSchema),
  questions: z.array(questionSchema),
  reviews: z.array(reviewRecordSchema),
  scope: z.array(scopeTargetSchema),
} as const satisfies Record<keyof typeof DATA_FILES, z.ZodType>

export type DataFileKey = keyof typeof DATA_FILES

/** Counts in the manifest that must match the loaded files (assets.json has its own pipeline). */
const COUNTED_KEYS = ['structures', 'relations', 'sources', 'lessons', 'questions', 'reviews', 'scope'] as const

export interface ContentLoadProblem {
  file: string
  kind: 'network' | 'http' | 'json' | 'schema' | 'version'
  status?: number
  message: string
}

export class ContentLoadError extends Error {
  readonly problems: ContentLoadProblem[]
  /** True when retrying may help (network failure, 408/429/5xx, mixed deploy). */
  readonly retryable: boolean

  constructor(problems: ContentLoadProblem[]) {
    super(formatProblems(problems))
    this.name = 'ContentLoadError'
    this.problems = problems
    this.retryable = problems.some(
      (p) =>
        p.kind === 'network' ||
        p.kind === 'version' ||
        (p.kind === 'http' && p.status !== undefined && (p.status === 408 || p.status === 429 || p.status >= 500)),
    )
  }
}

function formatProblems(problems: readonly ContentLoadProblem[]): string {
  const head =
    problems.length === 1
      ? 'Anatomi içeriği yüklenemedi.'
      : `Anatomi içeriği yüklenemedi: ${problems.length} dosyada sorun var.`
  return [head, ...problems.map((p) => `• ${p.file}: ${p.message}`)].join('\n')
}

const trErrorMap = trLocale().localeError

function describeZodError(err: z.ZodError, max = 5): string {
  const lines = err.issues.slice(0, max).map((i) => {
    const path = i.path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`)).join('').replace(/^\./, '')
    return `${path || '(kök)'}: ${i.message}`
  })
  const more = err.issues.length > max ? ` (+${err.issues.length - max} sorun daha)` : ''
  return `içerik biçimi geçersiz — ${lines.join('; ')}${more}`
}

export function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === '') return path
  return baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
}

type Parsed = { [K in DataFileKey]: z.output<(typeof DATA_FILE_SCHEMAS)[K]> }

async function loadOne<K extends DataFileKey>(
  key: K,
  baseUrl: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; key: K; value: Parsed[K] } | { ok: false; problem: ContentLoadProblem }> {
  const file = DATA_FILES[key]
  let res: Response
  try {
    res = await fetchImpl(joinUrl(baseUrl, file), { cache: 'no-cache' })
  } catch (e) {
    return { ok: false, problem: { file, kind: 'network', message: `bağlantı kurulamadı (${e instanceof Error ? e.message : String(e)}). İnternet bağlantınızı kontrol edip yeniden deneyin.` } }
  }
  if (!res.ok) {
    const hint = res.status === 404 ? 'dosya bulunamadı; içerik derlemesi (npm run content:build) eksik olabilir' : 'sunucu isteği yanıtlayamadı'
    return { ok: false, problem: { file, kind: 'http', status: res.status, message: `HTTP ${res.status} — ${hint}.` } }
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, problem: { file, kind: 'json', message: 'dosya geçerli JSON değil.' } }
  }
  const parsed = DATA_FILE_SCHEMAS[key].safeParse(data, { error: trErrorMap })
  if (!parsed.success) return { ok: false, problem: { file, kind: 'schema', message: describeZodError(parsed.error) } }
  return { ok: true, key, value: parsed.data as Parsed[K] }
}

/**
 * Fetch all DATA_FILES in parallel and validate them.
 * @param baseUrl app base (e.g. `import.meta.env.BASE_URL`, "./" or "https://host/app/").
 * @throws ContentLoadError listing every failed file.
 */
export async function loadContentBundle(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<ContentBundle> {
  const keys = Object.keys(DATA_FILES) as DataFileKey[]
  const results = await Promise.all(keys.map((k) => loadOne(k, baseUrl, fetchImpl)))
  const problems: ContentLoadProblem[] = []
  const values: Partial<Parsed> = {}
  for (const r of results) {
    if (r.ok) (values as Record<string, unknown>)[r.key] = r.value
    else problems.push(r.problem)
  }
  if (problems.length > 0) throw new ContentLoadError(problems)
  const v = values as Parsed

  if (v.manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new ContentLoadError([{ file: DATA_FILES.manifest, kind: 'schema', message: `şema sürümü ${v.manifest.schemaVersion}, uygulama ${SCHEMA_VERSION} bekliyor.` }])
  }
  const mismatched = COUNTED_KEYS.filter((k) => {
    const expected = v.manifest.counts[k]
    return expected !== undefined && expected !== v[k].length
  })
  if (mismatched.length > 0) {
    throw new ContentLoadError(
      mismatched.map((k) => ({
        file: DATA_FILES[k],
        kind: 'version' as const,
        message: `kayıt sayısı (${v[k].length}) içerik bildirimindeki sayıyla (${v.manifest.counts[k]}) uyuşmuyor; dosyalar farklı içerik sürümlerine ait olabilir. Sayfayı yenileyip yeniden deneyin.`,
      })),
    )
  }

  return {
    manifest: v.manifest,
    systems: v.taxonomy.systems,
    regions: v.taxonomy.regions,
    structures: v.structures,
    relations: v.relations,
    sources: v.sources,
    assets: v.assets,
    lessons: v.lessons,
    questions: v.questions,
    reviews: v.reviews,
    scope: v.scope,
  }
}
