/**
 * Output files and manifest of the compiled bundle (public/data/*.json).
 */
import { createHash } from 'node:crypto'
import { SCHEMA_VERSION, type ContentManifest } from '../../../src/core/schema.ts'
import type { DATA_FILES } from '../../../src/data/types.ts'
import type { CompiledContent } from './compile.ts'
import { contentCounts } from './integrity.ts'
import type { TextFile } from './io.ts'

export type DataKey = keyof typeof DATA_FILES
/** Files written by the content build (assets.json belongs to the model pipeline). */
export type ContentDataKey = Exclude<DataKey, 'manifest' | 'assets'>

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * contentVersion = first 16 hex chars of SHA-256 over the schema version and every input
 * file (path + text, sorted by path). Identical inputs always give the same version.
 */
export function contentVersionOf(inputs: readonly TextFile[]): string {
  const h = createHash('sha256')
  h.update(`schema:${SCHEMA_VERSION}\n`)
  for (const f of [...inputs].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    h.update(f.path)
    h.update('\u0000')
    h.update(f.text)
    h.update('\u0000')
  }
  return h.digest('hex').slice(0, 16)
}

/** JSON values of the content-owned output files. */
export function contentOutputs(c: CompiledContent): Record<ContentDataKey, unknown> {
  return {
    taxonomy: { systems: c.systems, regions: c.regions },
    structures: c.structures,
    relations: c.relations,
    sources: c.sources,
    lessons: c.lessons,
    questions: c.questions,
    reviews: c.reviews,
    scope: c.scope,
  }
}

/** Build-time date: SOURCE_DATE_EPOCH (seconds) for reproducible builds, else now. */
export function buildTimestamp(env: Record<string, string | undefined> = process.env): string {
  const epoch = env.SOURCE_DATE_EPOCH
  if (epoch && /^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000).toISOString()
  return new Date().toISOString()
}

/**
 * Manifest. `files` maps each data key to "sha256:<hex>" of the written file, so clients
 * and deploy checks can detect mixed or partially updated bundles.
 */
export function buildManifest(args: {
  content: CompiledContent
  contentVersion: string
  generatedAt: string
  fileTexts: Partial<Record<DataKey, string>>
}): ContentManifest {
  const files: Record<string, string> = {}
  for (const [key, text] of Object.entries(args.fileTexts)) {
    if (key !== 'manifest' && text !== undefined) files[key] = `sha256:${sha256(text)}`
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: args.contentVersion,
    generatedAt: args.generatedAt,
    counts: contentCounts(args.content),
    files,
  }
}
