/**
 * File-system access for the content pipeline (the only impure part besides the CLIs).
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import type { ContentFile } from './compile.ts'
import { error, type Issue } from './issues.ts'

export const REPO_ROOT = resolve(import.meta.dirname, '../../..')
export const CONTENT_DIR = join(REPO_ROOT, 'content')
export const PUBLIC_DIR = join(REPO_ROOT, 'public')

const toPosix = (p: string) => p.split(sep).join('/')

/** Repo-relative path for messages (absolute when outside the repository). */
export function repoRelative(abs: string): string {
  const rel = relative(REPO_ROOT, abs)
  return rel.startsWith('..') ? toPosix(abs) : toPosix(rel)
}

/** Recursively list *.json files below `dir` (relative, '/' separated, sorted). Missing dir -> []. */
export async function listJsonFiles(dir: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(dir, { recursive: true })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  return entries
    .map(toPosix)
    .filter((p) => p.endsWith('.json') && !p.split('/').some((seg) => seg.startsWith('.')))
    .sort()
}

export interface TextFile {
  /** Path relative to the repository root. */
  path: string
  text: string
}

export interface ReadJsonResult {
  files: ContentFile[]
  /** Raw texts (repo-relative paths) for hashing. */
  texts: TextFile[]
  issues: Issue[]
}

/** Read and JSON-parse every *.json file under `dir`; ContentFile paths are relative to `dir`. */
export async function readJsonTree(dir: string): Promise<ReadJsonResult> {
  const out: ReadJsonResult = { files: [], texts: [], issues: [] }
  for (const rel of await listJsonFiles(dir)) {
    const abs = join(dir, rel)
    const label = repoRelative(abs)
    let text: string
    try {
      text = await readFile(abs, 'utf8')
    } catch (e) {
      out.issues.push(error('file_read', `Dosya okunamadı: ${(e as Error).message}`, { file: label }))
      continue
    }
    out.texts.push({ path: label, text })
    try {
      out.files.push({ path: rel, data: JSON.parse(text) as unknown })
    } catch (e) {
      out.issues.push(error('file_format', `Geçerli JSON değil: ${(e as Error).message}`, { file: label }))
    }
  }
  return out
}

/** Read one optional JSON file. Returns null when it does not exist. */
export async function readOptionalJson(abs: string): Promise<{ text: string; data: unknown } | null> {
  let text: string
  try {
    text = await readFile(abs, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  return { text, data: JSON.parse(text) as unknown }
}

export async function writeText(abs: string, text: string): Promise<void> {
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, text, 'utf8')
}

/** Pretty JSON for authored/committed files (stable 2-space format, trailing newline). */
export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function hasFlag(name: string, argv: readonly string[] = process.argv.slice(2)): boolean {
  return argv.includes(name)
}

/** Value of `--name value` or `--name=value`, if given. */
export function argValue(name: string, argv: readonly string[] = process.argv.slice(2)): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === name) return argv[i + 1]
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1)
  }
  return undefined
}
