/**
 * Shared "read content/** + public/data/assets.json, compile, check" step used by
 * build-content, validate-content and the coverage report.
 */
import { readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { DATA_FILES } from '../../../src/data/types.ts'
import { compileContent, type CompiledContent } from './compile.ts'
import { checkIntegrity } from './integrity.ts'
import { error, type Issue } from './issues.ts'
import { CONTENT_DIR, PUBLIC_DIR, argValue, readJsonTree, readOptionalJson, repoRelative, type TextFile } from './io.ts'

export const ASSETS_PATH = join(PUBLIC_DIR, DATA_FILES.assets)

export interface PipelinePaths {
  contentDir: string
  /** Directory the bundle is written to (DATA_FILES paths are relative to it). */
  publicDir: string
  /** Model asset catalogue to read (default: <publicDir>/data/assets.json). */
  assetsPath: string
}

/** CLI options shared by the content scripts: --content-dir <dir>, --out <dir>, --assets <file>. */
export function pathsFromArgs(argv: readonly string[] = process.argv.slice(2)): PipelinePaths {
  const contentDir = resolve(argValue('--content-dir', argv) ?? CONTENT_DIR)
  const publicDir = resolve(argValue('--out', argv) ?? PUBLIC_DIR)
  const assetsPath = resolve(argValue('--assets', argv) ?? join(publicDir, DATA_FILES.assets))
  return { contentDir, publicDir, assetsPath }
}

export interface PipelineResult {
  content: CompiledContent
  issues: Issue[]
  /** All inputs (content files + assets.json when present) for the content version hash. */
  inputs: TextFile[]
  /** Raw text of public/data/assets.json, or null when the model pipeline has not run. */
  assetsText: string | null
  /** True when assets-*.json files were merged into the catalogue (assets.json must be rewritten). */
  assetsMerged: boolean
}

export async function loadContent(opts: { contentDir?: string; assetsPath?: string } = {}): Promise<PipelineResult> {
  const contentDir = opts.contentDir ?? CONTENT_DIR
  const tree = await readJsonTree(contentDir)
  const issues: Issue[] = [...tree.issues]
  const inputs: TextFile[] = [...tree.texts]
  const assetsPath = opts.assetsPath ?? ASSETS_PATH
  let assets: { path: string; data: unknown } | null = null
  let assetsText: string | null = null
  try {
    const a = await readOptionalJson(assetsPath)
    if (a) {
      assets = { path: repoRelative(assetsPath), data: a.data }
      assetsText = a.text
      inputs.push({ path: repoRelative(assetsPath), text: a.text })
    }
  } catch (e) {
    issues.push(error('file_format', `Model varlık dosyası okunamadı: ${(e as Error).message}`, { file: repoRelative(assetsPath) }))
  }
  // Additional model pipelines (e.g. HRA: assets-hra.json) are merged by asset id.
  let assetsMerged = false
  const dir = dirname(assetsPath)
  const extras = (await readdir(dir).catch(() => [] as string[])).filter((f) => /^assets-.+\.json$/.test(f)).sort()
  for (const f of extras) {
    const path = join(dir, f)
    try {
      const a = await readOptionalJson(path)
      if (!a || !Array.isArray(a.data)) continue
      const base = Array.isArray(assets?.data) ? (assets.data as { id?: string }[]) : []
      const ids = new Set((a.data as { id?: string }[]).map((x) => x.id))
      const merged = [...base.filter((x) => !ids.has(x.id)), ...(a.data as unknown[])]
      assets = { path: assets?.path ?? repoRelative(assetsPath), data: merged }
      assetsText = JSON.stringify(merged)
      inputs.push({ path: repoRelative(path), text: a.text })
      assetsMerged = true
    } catch (e) {
      issues.push(error('file_format', `Model varlık dosyası okunamadı: ${(e as Error).message}`, { file: repoRelative(path) }))
    }
  }
  const compiled = compileContent({ files: tree.files, assets, contentPrefix: `${repoRelative(contentDir)}/` })
  issues.push(...compiled.issues)
  issues.push(...checkIntegrity(compiled.content))
  return { content: compiled.content, issues, inputs, assetsText, assetsMerged }
}
