/**
 * Network helpers for content scripts: snapshots are cached in vendor/terminology/ with URL,
 * retrieval date and sha256 so builds are reproducible; --refresh re-downloads.
 * Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { REPO_ROOT } from './io.ts'

const CACHE = join(REPO_ROOT, 'vendor', 'terminology')
const UA = 'anatomi-3b/0.1 (egitim projesi; https://github.com/fttjygh8np-a11y/human-anatomy)'
const refresh = process.argv.includes('--refresh')

export interface Cached<T> {
  url: string
  retrievedAt: string
  sha256: string
  data: T
}

export async function cached<T>(name: string, url: string, load: () => Promise<{ raw: string; data: T }>): Promise<Cached<T>> {
  const file = join(CACHE, name)
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as Cached<T>
    } catch {
      // not cached yet
    }
  }
  const { raw, data } = await load()
  const entry: Cached<T> = {
    url,
    retrievedAt: new Date().toISOString().slice(0, 10),
    sha256: createHash('sha256').update(raw).digest('hex'),
    data,
  }
  await mkdir(CACHE, { recursive: true })
  await writeFile(file, JSON.stringify(entry))
  return entry
}

export async function get(url: string, accept = '*/*'): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.text()
}

export async function sparql<T>(query: string): Promise<T[]> {
  const text = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, 'application/sparql-results+json')
  return (JSON.parse(text) as { results: { bindings: T[] } }).results.bindings
}
