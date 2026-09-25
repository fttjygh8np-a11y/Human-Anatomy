/**
 * Download helpers for scripts/models/fetch-bodyparts3d.ts: directory listing parsing, resumable
 * downloads (HTTP Range), streaming unzip (fflate) and clear Turkish error messages when the source
 * host is unreachable (e.g. blocked by a proxy / network policy).
 */
import { closeSync, createReadStream, createWriteStream, existsSync, mkdirSync, openSync, renameSync, rmSync, statSync, writeSync } from 'node:fs'
import { dirname, isAbsolute, normalize, relative, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'
import { Unzip, UnzipInflate } from 'fflate'
import { naturalCompare, sha256File } from './util.ts'

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/** The source could not be reached; the message explains the manual/offline alternative. */
export class SourceUnavailableError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'SourceUnavailableError'
    this.status = status
  }
}

export function describeUnavailable(url: string, detail: string, destDir: string): string {
  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  return [
    `BodyParts3D kaynağına erişilemedi: ${url}`,
    `Neden: ${detail}`,
    `Bu ortamın ağ politikası veya vekil sunucusu (proxy) "${host}" adresine izin vermiyor olabilir.`,
    'Çözüm seçenekleri:',
    `  1) "${host}" alan adını ağ çıkış izin listesine ekletip komutu yeniden çalıştırın.`,
    `  2) Dosyaları erişimi olan bir makinede ${url} adresinden indirin (isa_BP3D_*_obj_99.zip ve .txt ilişki dosyaları),`,
    `     "${destDir}" klasörüne kopyalayın ve "npm run models:fetch -- --offline" ile sha256 kaydını ve arşiv açmayı tamamlayın.`,
    'Not: Başka bir kaynaktan gelen dosyaları BodyParts3D yerine kullanmayın; lisans ve kimlik eşleşmesi bu kaynağa göre kayıtlıdır.',
  ].join('\n')
}

/** fetch() with failures converted to SourceUnavailableError (HTTP 403/404/5xx, proxy refusals, DNS…). */
export async function fetchChecked(url: string, init: RequestInit, destDir: string, fetchImpl: FetchLike = fetch): Promise<Response> {
  let res: Response
  try {
    res = await fetchImpl(url, init)
  } catch (err) {
    const cause = (err as { cause?: { message?: string; code?: string } }).cause
    const causeText = [cause?.code, cause?.message].filter(Boolean).join(': ')
    const proxy403 = /Proxy response \(403\)/.test(causeText)
    const detail = proxy403
      ? 'HTTP 403 — vekil sunucu bağlantıyı reddetti (CONNECT tüneli kurulamadı)'
      : `ağ hatası (${causeText || (err as Error).message})`
    throw new SourceUnavailableError(describeUnavailable(url, detail, destDir), proxy403 ? 403 : null)
  }
  if (res.status === 200 || res.status === 206 || res.status === 416) return res
  const deny = res.headers.get('x-deny-reason')
  let body = ''
  try {
    body = (await res.text()).slice(0, 200).trim()
  } catch {
    // ignore
  }
  const detail =
    res.status === 403
      ? `HTTP 403 Forbidden${deny ? ` (x-deny-reason: ${deny})` : ''}${body ? ` — "${body}"` : ''}`
      : `HTTP ${res.status} ${res.statusText}${body ? ` — "${body}"` : ''}`
  throw new SourceUnavailableError(describeUnavailable(url, detail, destDir), res.status)
}

export interface ListingEntry {
  name: string
  url: string
}

/** File entries of an Apache/nginx-style directory index (same directory only, no sub-directories). */
export function parseDirectoryListing(html: string, baseUrl: string): ListingEntry[] {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  const seen = new Map<string, ListingEntry>()
  const re = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const href = (m[2] ?? m[3] ?? m[4] ?? '').trim()
    if (!href || href.startsWith('?') || href.startsWith('#') || href.startsWith('mailto:')) continue
    let url: URL
    try {
      url = new URL(href, base)
    } catch {
      continue
    }
    if (url.origin !== base.origin || url.search) continue
    if (!url.pathname.startsWith(base.pathname)) continue
    const rest = url.pathname.slice(base.pathname.length)
    if (!rest || rest.includes('/')) continue
    const name = decodeURIComponent(rest)
    if (!seen.has(name)) seen.set(name, { name, url: url.href })
  }
  return [...seen.values()].sort((a, b) => naturalCompare(a.name, b.name))
}

export interface DownloadResult {
  bytes: number
  sha256: string
  resumedFrom: number
  lastModified: string | null
  etag: string | null
}

/**
 * Downloads `url` to `dest`, resuming from `dest + '.part'` with an HTTP Range request. A complete
 * file already at `dest` is re-validated the same way (the server answers 416 when nothing is left).
 */
export async function downloadWithResume(
  url: string,
  dest: string,
  opts: { destDir: string; fetchImpl?: FetchLike; onProgress?: (received: number, total: number | null) => void },
): Promise<DownloadResult> {
  const part = `${dest}.part`
  mkdirSync(dirname(dest), { recursive: true })
  if (existsSync(dest) && !existsSync(part)) renameSync(dest, part)
  let start = existsSync(part) ? statSync(part).size : 0
  const resumedFrom = start

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers: Record<string, string> = start > 0 ? { Range: `bytes=${start}-` } : {}
    const res = await fetchChecked(url, { headers }, opts.destDir, opts.fetchImpl)
    const lastModified = res.headers.get('last-modified')
    const etag = res.headers.get('etag')
    if (res.status === 416) {
      const total = Number(/\/(\d+)\s*$/.exec(res.headers.get('content-range') ?? '')?.[1] ?? NaN)
      await res.body?.cancel()
      if (start > 0 && (!Number.isFinite(total) || total === start)) {
        renameSync(part, dest)
        return { bytes: start, sha256: await sha256File(dest), resumedFrom, lastModified, etag }
      }
      rmSync(part, { force: true })
      start = 0
      continue
    }
    let expectedTotal: number | null = null
    let append = false
    if (res.status === 206) {
      const m = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/.exec(res.headers.get('content-range') ?? '')
      if (!m || Number(m[1]) !== start) {
        await res.body?.cancel()
        rmSync(part, { force: true })
        start = 0
        continue
      }
      append = true
      expectedTotal = m[3] === '*' ? null : Number(m[3])
    } else {
      // 200: full body (server ignored the Range header or no resume was requested).
      start = 0
      const len = res.headers.get('content-length')
      expectedTotal = len ? Number(len) : null
    }
    if (!res.body) throw new Error(`Boş yanıt gövdesi: ${url}`)
    let received = start
    const body = Readable.fromWeb(res.body as unknown as NodeWebReadableStream<Uint8Array>)
    body.on('data', (chunk: Buffer) => {
      received += chunk.length
      opts.onProgress?.(received, expectedTotal)
    })
    await pipeline(body, createWriteStream(part, { flags: append ? 'a' : 'w' }))
    const size = statSync(part).size
    if (expectedTotal !== null && size !== expectedTotal) {
      throw new Error(`İndirme eksik kaldı (${size}/${expectedTotal} bayt): ${url}. Komutu yeniden çalıştırınca kaldığı yerden devam eder.`)
    }
    renameSync(part, dest)
    return { bytes: size, sha256: await sha256File(dest), resumedFrom, lastModified, etag }
  }
  throw new Error(`İndirme yeniden başlatılamadı: ${url}`)
}

/** Streams a zip archive into `outDir` with fflate; rejects entries that would escape `outDir`. */
export async function unzipFile(zipPath: string, outDir: string): Promise<{ files: number; bytes: number }> {
  const root = resolve(outDir)
  mkdirSync(root, { recursive: true })
  let files = 0
  let bytes = 0
  let failure: Error | null = null
  const unzip = new Unzip()
  unzip.register(UnzipInflate)
  unzip.onfile = (file) => {
    const name = file.name.replace(/\\/g, '/')
    if (name.endsWith('/')) return
    const target = resolve(root, normalize(name))
    const rel = relative(root, target)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
      failure ??= new Error(`Güvensiz arşiv girdisi reddedildi: "${file.name}"`)
      return
    }
    mkdirSync(dirname(target), { recursive: true })
    const fd = openSync(target, 'w')
    files++
    file.ondata = (err, data, final) => {
      if (err) {
        failure ??= new Error(`Arşiv açılamadı (${file.name}): ${err.message}`)
        closeSync(fd)
        return
      }
      if (data.length > 0) {
        writeSync(fd, data)
        bytes += data.length
      }
      if (final) closeSync(fd)
    }
    file.start()
  }
  for await (const chunk of createReadStream(zipPath)) {
    unzip.push(chunk as Uint8Array)
    if (failure) throw failure
  }
  unzip.push(new Uint8Array(0), true)
  if (failure) throw failure
  return { files, bytes }
}

export function joinUrl(base: string, name: string): string {
  return new URL(encodeURIComponent(name), base.endsWith('/') ? base : `${base}/`).href
}
