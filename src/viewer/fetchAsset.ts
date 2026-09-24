/**
 * Downloading model files: streamed fetch with progress, abort support, integrity check
 * and user-facing (Turkish) error classification. No Three.js here.
 */

export class AssetLoadError extends Error {
  readonly retryable: boolean
  readonly status: number | undefined
  constructor(message: string, retryable: boolean, status?: number) {
    super(message)
    this.name = 'AssetLoadError'
    this.retryable = retryable
    this.status = status
  }
}

/** Transient HTTP failures worth retrying. */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500
}

export const isAbortError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'name' in e && (e as { name: unknown }).name === 'AbortError'

export interface FetchAssetOptions {
  signal?: AbortSignal
  /** Expected size in bytes (from the asset catalogue); preferred over Content-Length. */
  expectedBytes?: number
  onProgress?: (loaded: number, total: number | null) => void
  fetchImpl?: typeof fetch
}

export async function fetchAssetBuffer(url: string, opts: FetchAssetOptions = {}): Promise<ArrayBuffer> {
  const doFetch = opts.fetchImpl ?? fetch
  let res: Response
  try {
    res = await doFetch(url, { signal: opts.signal })
  } catch (e) {
    if (isAbortError(e)) throw e
    throw new AssetLoadError('Ağ bağlantısı kurulamadı; model dosyası indirilemedi.', true)
  }
  if (!res.ok) {
    const retryable = isRetryableStatus(res.status)
    const msg =
      res.status === 404
        ? 'Model dosyası bulunamadı (HTTP 404).'
        : `Model dosyası indirilemedi (HTTP ${res.status}).`
    throw new AssetLoadError(msg, retryable, res.status)
  }
  const headerLen = Number(res.headers.get('content-length'))
  let total: number | null =
    opts.expectedBytes && opts.expectedBytes > 0 ? opts.expectedBytes : Number.isFinite(headerLen) && headerLen > 0 ? headerLen : null
  const report = (loaded: number) => {
    // Compressed transfers may report a smaller Content-Length than the decoded body.
    if (total !== null && loaded > total) total = null
    opts.onProgress?.(loaded, total)
  }

  try {
    if (!res.body) {
      const buf = await res.arrayBuffer()
      report(buf.byteLength)
      return buf
    }
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    report(0)
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.byteLength
      report(loaded)
    }
    const out = new Uint8Array(loaded)
    let offset = 0
    for (const c of chunks) {
      out.set(c, offset)
      offset += c.byteLength
    }
    return out.buffer
  } catch (e) {
    if (isAbortError(e)) throw e
    throw new AssetLoadError('İndirme sırasında bağlantı kesildi.', true)
  }
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Throws when the catalogue hash does not match (skipped when WebCrypto is unavailable, e.g. insecure context). */
export async function verifySha256(buffer: ArrayBuffer, expected: string): Promise<void> {
  const actual = await sha256Hex(buffer)
  if (actual === null) return
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new AssetLoadError('Model dosyası katalogdaki sağlama değeriyle eşleşmiyor; dosya bozuk ya da farklı bir sürüm olabilir.', true)
  }
}

/** Normalises any failure into a user-facing message + retry hint. */
export function describeLoadError(e: unknown): { message: string; retryable: boolean } {
  if (e instanceof AssetLoadError) return { message: e.message, retryable: e.retryable }
  const detail = e instanceof Error ? e.message : String(e)
  return { message: `Model dosyası okunamadı: ${detail}`, retryable: false }
}

/** Directory part of a URL, used by GLTFLoader to resolve external resources. */
export function resourcePathOf(url: string): string {
  const q = url.search(/[?#]/)
  const clean = q >= 0 ? url.slice(0, q) : url
  const i = clean.lastIndexOf('/')
  return i >= 0 ? clean.slice(0, i + 1) : ''
}
