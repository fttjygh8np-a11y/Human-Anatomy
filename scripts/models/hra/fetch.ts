/**
 * Download step of `npm run models:hra`: caches the selected HRA datasets in vendor/hra/
 * (gitignored) and records url, size, sha256, ETag/Last-Modified and date per file in
 * vendor/hra/manifest.json.
 *
 * Per dataset (<name>/<version>/):
 *   metadata.json   dataset metadata; its license must be CC BY 4.0, otherwise the build stops
 *   crosswalk.csv   node name -> ontology id + label
 *   <file>.glb      whole GLB ('full' datasets), or
 *   <file>.glb.prefix + ranges/<start>-<end>.bin   GLB header/JSON chunk and only the byte ranges of
 *                   the selected meshes ('ranges' datasets: the ~375 MB united body file). Range
 *                   responses must agree on the total size and ETag of the prefix request.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { FetchLike } from '../lib/download.ts'
import { sha256, toJson } from '../lib/util.ts'
import { coalesceRanges, findNode, glbPrefixLength, meshRanges, nodeTable, parseGlbHeader, parseGlbLayout } from './glb.ts'
import { datasetBaseUrl, HRA_LICENSE, type HraDataset } from './source.ts'

export interface ManifestFile {
  url: string
  bytes: number
  sha256: string
  fetchedAt: string
  etag: string | null
  lastModified: string | null
  /** Inclusive byte range of the remote file, for partial downloads. */
  range?: { start: number; end: number; total: number }
}

export interface HraManifest {
  manifestVersion: 1
  files: Record<string, ManifestFile>
}

export class HraUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HraUnavailableError'
  }
}

export class HraLicenseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HraLicenseError'
  }
}

export function readManifest(vendorDir: string): HraManifest {
  const path = join(vendorDir, 'manifest.json')
  if (!existsSync(path)) return { manifestVersion: 1, files: {} }
  return JSON.parse(readFileSync(path, 'utf8')) as HraManifest
}

function unavailable(url: string, detail: string): HraUnavailableError {
  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  return new HraUnavailableError(
    [
      `HRA kaynağına erişilemedi: ${url}`,
      `Neden: ${detail}`,
      `Ağ politikası veya vekil sunucu "${host}" adresine izin vermiyor olabilir; vekil sunucu arkasında NODE_USE_ENV_PROXY=1 ile çalıştırın.`,
      'Önbellek (vendor/hra) doluysa "npm run models:hra -- --offline" ağ olmadan derler.',
    ].join('\n'),
  )
}

async function get(url: string, fetchImpl: FetchLike, range?: { start: number; end: number }): Promise<Response> {
  let res: Response
  try {
    res = await fetchImpl(url, range ? { headers: { Range: `bytes=${range.start}-${range.end}` } } : {})
  } catch (err) {
    const cause = (err as { cause?: { message?: string; code?: string } }).cause
    throw unavailable(url, `ağ hatası (${[cause?.code, cause?.message].filter(Boolean).join(': ') || (err as Error).message})`)
  }
  if (range ? res.status !== 206 : res.status !== 200) {
    const body = await res.text().catch(() => '')
    throw unavailable(url, `HTTP ${res.status}${range ? ' (206 Partial Content bekleniyordu)' : ''}${body ? ` — "${body.slice(0, 160).trim()}"` : ''}`)
  }
  return res
}

export interface FetchOptions {
  vendorDir: string
  datasets: readonly HraDataset[]
  /** Mesh node names needed from each 'ranges' dataset. */
  nodesFor: (dataset: string) => readonly string[]
  offline?: boolean
  refresh?: boolean
  fetchImpl?: FetchLike
  log?: (m: string) => void
  now?: () => Date
}

export interface DatasetFiles {
  dataset: HraDataset
  dir: string
  metadata: DatasetMetadata
  crosswalkPath: string
  glb: { mode: 'full'; path: string } | { mode: 'ranges'; prefixPath: string; ranges: { start: number; path: string }[] }
  /** Manifest keys of every file used. */
  files: string[]
}

export interface DatasetMetadata {
  license: string
  licenseText: string
  citation: string | null
  doi: string | null
  creationDate: string | null
  glbUrl: string
  crosswalkUrl: string
}

/** Reads the fields the pipeline needs from an HRA dataset metadata.json and checks the license. */
export function parseDatasetMetadata(raw: unknown, datasetLabel: string): DatasetMetadata {
  const m = raw as {
    license?: string
    was_derived_from?: { license?: string; citation?: string; doi?: string; creation_date?: string; distributions?: { downloadUrl?: string; mediaType?: string }[] }
  }
  const license = m.license ?? ''
  const licenseText = m.was_derived_from?.license ?? ''
  if (license !== HRA_LICENSE.url || !/CC BY 4\.0/.test(licenseText)) {
    throw new HraLicenseError(
      `${datasetLabel}: lisans beyanı beklenen CC BY 4.0 değil (license: "${license}", açıklama: "${licenseText}"). ` +
        'Dağıtım/değiştirme izni doğrulanmadan bu veri kullanılamaz; derleme durduruldu.',
    )
  }
  const dists = m.was_derived_from?.distributions ?? []
  const glbUrl = dists.find((d) => d.mediaType === 'model/gltf-binary')?.downloadUrl
  const crosswalkUrl = dists.find((d) => d.mediaType === 'text/csv')?.downloadUrl
  if (!glbUrl || !crosswalkUrl) throw new Error(`${datasetLabel}: metadata.json içinde GLB veya crosswalk.csv dağıtımı bulunamadı.`)
  return {
    license,
    licenseText,
    citation: m.was_derived_from?.citation?.replace(/\s+/g, ' ').trim() ?? null,
    doi: m.was_derived_from?.doi ?? null,
    creationDate: m.was_derived_from?.creation_date ?? null,
    glbUrl,
    crosswalkUrl,
  }
}

export async function fetchHra(opts: FetchOptions): Promise<{ manifest: HraManifest; datasets: DatasetFiles[] }> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const log = opts.log ?? (() => {})
  const now = opts.now ?? (() => new Date())
  mkdirSync(opts.vendorDir, { recursive: true })
  const manifest = readManifest(opts.vendorDir)
  const save = () => writeFileSync(join(opts.vendorDir, 'manifest.json'), toJson(manifest))

  const cachedOk = (key: string): boolean => {
    const entry = manifest.files[key]
    const path = join(opts.vendorDir, key)
    return !!entry && existsSync(path) && sha256(readFileSync(path)) === entry.sha256
  }

  /** Returns the local path of `key`, downloading it unless a verified copy is cached. */
  const obtain = async (key: string, url: string, range?: { start: number; end: number }, expect?: { total: number; etag: string | null }) => {
    const path = join(opts.vendorDir, key)
    if (!opts.refresh && cachedOk(key)) return path
    if (opts.offline) throw new Error(`Çevrimdışı mod: ${key} önbellekte yok veya sha256 uyuşmuyor. Önce ağ erişimiyle "npm run models:hra" çalıştırın.`)
    const res = await get(url, fetchImpl, range)
    const bytes = new Uint8Array(await res.arrayBuffer())
    const etag = res.headers.get('etag')
    let rangeMeta: ManifestFile['range']
    if (range) {
      const m = /bytes\s+(\d+)-(\d+)\/(\d+)/.exec(res.headers.get('content-range') ?? '')
      if (!m || Number(m[1]) !== range.start || Number(m[2]) !== range.end) throw unavailable(url, `beklenmeyen Content-Range "${res.headers.get('content-range')}"`)
      const total = Number(m[3])
      if (expect && (total !== expect.total || (expect.etag && etag && etag !== expect.etag))) {
        throw new Error(`${url}: uzak dosya indirme sırasında değişmiş (boyut ${total}/${expect.total}, ETag ${etag}/${expect.etag}); komutu --refresh ile yeniden çalıştırın.`)
      }
      if (bytes.byteLength !== range.end - range.start + 1) throw unavailable(url, `eksik aralık yanıtı (${bytes.byteLength} bayt)`)
      rangeMeta = { start: range.start, end: range.end, total }
    }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, bytes)
    manifest.files[key] = {
      url,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      fetchedAt: now().toISOString(),
      etag,
      lastModified: res.headers.get('last-modified'),
      ...(rangeMeta ? { range: rangeMeta } : {}),
    }
    save()
    log(`↓ ${key} (${bytes.byteLength} bayt)`)
    return path
  }

  const out: DatasetFiles[] = []
  for (const d of opts.datasets) {
    const dirKey = `${d.name}/${d.version}`
    const base = datasetBaseUrl(d)
    const files: string[] = []
    const metaKey = `${dirKey}/metadata.json`
    const metaPath = await obtain(metaKey, `${base}metadata.json`)
    files.push(metaKey)
    const metadata = parseDatasetMetadata(JSON.parse(readFileSync(metaPath, 'utf8')), `${d.name} ${d.version}`)

    const cwKey = `${dirKey}/crosswalk.csv`
    const crosswalkPath = await obtain(cwKey, metadata.crosswalkUrl)
    files.push(cwKey)

    const glbName = metadata.glbUrl.split('/').pop()!
    let glb: DatasetFiles['glb']
    if (d.glbMode === 'full') {
      const key = `${dirKey}/${glbName}`
      glb = { mode: 'full', path: await obtain(key, metadata.glbUrl) }
      files.push(key)
    } else {
      // Header first (20 bytes) to learn the JSON chunk length, then header + JSON + BIN header.
      const prefixKey = `${dirKey}/${glbName}.prefix`
      let prefixPath: string
      if (!opts.refresh && cachedOk(prefixKey)) prefixPath = join(opts.vendorDir, prefixKey)
      else {
        if (opts.offline) throw new Error(`Çevrimdışı mod: ${prefixKey} önbellekte yok.`)
        const head = await get(metadata.glbUrl, fetchImpl, { start: 0, end: 19 })
        const header = parseGlbHeader(new Uint8Array(await head.arrayBuffer()))
        prefixPath = await obtain(prefixKey, metadata.glbUrl, { start: 0, end: glbPrefixLength(header) - 1 })
      }
      files.push(prefixKey)
      const prefixEntry = manifest.files[prefixKey]!
      const layout = parseGlbLayout(new Uint8Array(readFileSync(prefixPath)))
      const table = nodeTable(layout.json)
      const wanted = opts.nodesFor(d.name).flatMap((name) => meshRanges(layout, findNode(table, name)))
      const ranges: { start: number; path: string }[] = []
      for (const r of coalesceRanges(wanted, 64 * 1024)) {
        const key = `${dirKey}/ranges/${r.start}-${r.start + r.length - 1}.bin`
        const path = await obtain(key, metadata.glbUrl, { start: r.start, end: r.start + r.length - 1 }, {
          total: prefixEntry.range?.total ?? layout.header.totalLength,
          etag: prefixEntry.etag,
        })
        ranges.push({ start: r.start, path })
        files.push(key)
      }
      glb = { mode: 'ranges', prefixPath, ranges }
    }
    out.push({ dataset: d, dir: join(opts.vendorDir, dirKey), metadata, crosswalkPath, glb, files })
  }
  save()
  return { manifest, datasets: out }
}
