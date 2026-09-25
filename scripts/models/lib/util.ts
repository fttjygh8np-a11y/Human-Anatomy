/**
 * Small deterministic helpers shared by the model pipeline scripts.
 */
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex')
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

/** Natural ordering for ids such as FJ2 < FJ10. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'variant' })
}

/** Rounds to a fixed number of decimals so JSON output is stable and compact. */
export function round(value: number, decimals = 6): number {
  const f = 10 ** decimals
  const r = Math.round(value * f) / f
  return Object.is(r, -0) ? 0 : r
}

/** Pretty JSON with a trailing newline (stable given stable key insertion order). */
export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * Build date for provenance records (YYYY-MM-DD, UTC). Deterministic builds pass an explicit date
 * or set SOURCE_DATE_EPOCH (seconds, reproducible-builds.org convention).
 */
export function resolveBuildDate(explicit?: string | null, env: NodeJS.ProcessEnv = process.env): string {
  if (explicit) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(explicit)) throw new Error(`Geçersiz tarih: "${explicit}" (beklenen biçim YYYY-AA-GG)`)
    return explicit
  }
  const epoch = env.SOURCE_DATE_EPOCH
  if (epoch && /^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000).toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

const require = createRequire(import.meta.url)

/** Installed version of a dependency (read from its package.json), for provenance records. */
export function packageVersion(name: string): string {
  try {
    // Resolve the entry point (package.json itself is often not exported) and walk up to the package root.
    let dir = dirname(require.resolve(name))
    for (;;) {
      const candidate = join(dir, 'package.json')
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string; version?: string }
        if (pkg.name === name) return pkg.version ?? 'unknown'
      }
      const parent = dirname(dir)
      if (parent === dir) return 'unknown'
      dir = parent
    }
  } catch {
    return 'unknown'
  }
}

/** Minimal `--key value` / `--flag` argument parser for the CLI scripts. */
export function parseArgs(argv: string[]): Map<string, string | true> {
  const out = new Map<string, string | true>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) throw new Error(`Beklenmeyen argüman: ${arg}`)
    const eq = arg.indexOf('=')
    if (eq > 0) {
      out.set(arg.slice(2, eq), arg.slice(eq + 1))
      continue
    }
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      out.set(arg.slice(2), next)
      i++
    } else out.set(arg.slice(2), true)
  }
  return out
}

export function argString(args: Map<string, string | true>, key: string): string | undefined {
  const v = args.get(key)
  if (v === undefined) return undefined
  if (v === true) throw new Error(`--${key} bir değer gerektirir`)
  return v
}
