/**
 * Build step of `npm run models:hra`: HRA female reproductive nodes -> meshopt-compressed GLBs in
 * public/models/hra/ + public/data/assets-hra.json (+ vendor/hra/build-report.json).
 *
 *  1. Checks the curated catalogue against the downloaded crosswalk.csv files (ids and labels).
 *  2. Reads the selected mesh nodes (world transforms applied), converts them to the app frame
 *     (identity: glTF 2.0 axes and metres, see ./source.ts), welds exact duplicate vertices and
 *     recomputes normals.
 *  3. Frame checks (stop the build on failure): left ovary at larger +X than the right ovary;
 *     ovaries/tubes above the cervix (+Y superior); uterovesical pouch in front of the uterosacral
 *     ligaments (+Z anterior). Laterality check per sided node against the midline measured from
 *     left/right pairs: a failing node is excluded (never silently re-labelled).
 *  4. Simplifies each asset to its triangle budget (meshoptimizer, bounded error, bbox-preservation
 *     check with fallback to full resolution) and writes GLBs with the shared writer (../lib/glb.ts).
 *
 * Assets are `lod: detail`, `registeredToBody: false`: the HRA body (Visible Human female) is a
 * different donor from BodyParts3D, so the viewer shows these models on their own.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assetSchema, COORDINATE_FRAME_ID, type AutomatedCheck, type ModelAsset, type Vec3 } from '../../../src/core/schema.ts'
import { writeGlb } from '../lib/glb.ts'
import { SYSTEM_COLORS } from '../lib/labels.ts'
import { allocateTriangleBudget, bboxDiagonal, computeVertexNormals, meshStats, simplifyMesh, type IndexedMesh, type MeshStats } from '../lib/mesh.ts'
import { packageVersion, round, sha256, toJson } from '../lib/util.ts'
import { FRAME_CHECK_NODES, HRA_EXCLUDED_NODES, HRA_NODES, HRA_RECORDS, type CatalogNode, type HraAssetKey } from './catalog.ts'
import type { DatasetFiles, HraManifest } from './fetch.ts'
import { bytesSource, findNode, nodeTable, parseGlbLayout, rangesSource, readNodeMesh, type ByteSource, type GlbLayout, type NodeInfo } from './glb.ts'
import { DERIVED_ATTRIBUTION, HRA_LICENSE, HRA_SOURCE_ID, hraToApp } from './source.ts'
import { ontologyIdFromStructureId } from './structures.ts'

export const HRA_BUILD_TOOL = 'scripts/models/hra/build-hra.ts'

export interface HraBuildConfig {
  triangleBudget: Record<HraAssetKey, number>
  minTrianglesPerElement: number
  /** meshoptimizer error bound, relative to each node's extent. */
  maxError: number
  /** Simplified bbox diagonal must keep at least this fraction, else the node stays at full resolution. */
  minBboxRatio: number
  /** Centroids closer than this to the midline are "on the midline" (laterality check). */
  midlineToleranceM: number
  quantization: { position: number; normal: number }
  meshoptLevel: 'medium' | 'high'
}

export const HRA_BUILD_CONFIG: HraBuildConfig = {
  triangleBudget: { organs: 60_000, ligaments: 40_000 },
  minTrianglesPerElement: 300,
  maxError: 0.004,
  minBboxRatio: 0.95,
  midlineToleranceM: 0.002,
  quantization: { position: 14, normal: 10 },
  meshoptLevel: 'high',
}

export const HRA_ASSETS: Record<HraAssetKey, { id: string; file: string; chunk: string; label: { tr: string; en: string } }> = {
  organs: {
    id: 'asset:hra.reproductive.pelvis_perineum',
    file: 'reproductive.pelvis_perineum.glb',
    chunk: 'reproductive/pelvis_perineum',
    label: { tr: 'Kadın üreme organları (HRA)', en: 'Female reproductive organs (HRA)' },
  },
  ligaments: {
    id: 'asset:hra.reproductive.pelvis_perineum.ligaments',
    file: 'reproductive.pelvis_perineum.ligaments.glb',
    // Third path segment = optional layer, loaded on demand (src/ui/model/modelSex.ts).
    chunk: 'reproductive/pelvis_perineum/ligaments',
    label: { tr: 'Uterus ve over bağları, periton kıvrımları (HRA)', en: 'Uterine and ovarian ligaments, peritoneal folds (HRA)' },
  },
}

// ------------------------------------------------------------------------------ crosswalk

export interface CrosswalkRow {
  node: string
  ontologyId: string
  label: string
}

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

/** crosswalk.csv of a single dataset: header `node_name,OntologyID,label`. */
export function parseCrosswalk(text: string): Map<string, CrosswalkRow> {
  const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''))
  const col = (name: string) => header?.findIndex((h) => h.trim() === name) ?? -1
  const iNode = col('node_name')
  const iId = col('OntologyID')
  const iLabel = col('label')
  if (iNode < 0 || iId < 0 || iLabel < 0) throw new Error(`crosswalk.csv başlığı beklenen biçimde değil: ${header?.join(',')}`)
  const out = new Map<string, CrosswalkRow>()
  for (const r of rows) {
    const node = r[iNode]?.trim() ?? ''
    if (!node) continue
    if (out.has(node)) throw new Error(`crosswalk.csv içinde "${node}" birden fazla kez geçiyor.`)
    out.set(node, { node, ontologyId: r[iId]?.trim() ?? '', label: r[iLabel]?.trim() ?? '' })
  }
  return out
}

/** Differences between the catalogue and the crosswalks (empty = consistent). */
export function verifyCatalog(crosswalks: ReadonlyMap<string, ReadonlyMap<string, CrosswalkRow>>): string[] {
  const problems: string[] = []
  const rowOf = (dataset: string, node: string) => {
    const cw = crosswalks.get(dataset)
    if (!cw) {
      problems.push(`${dataset}: crosswalk.csv yüklenmedi.`)
      return undefined
    }
    const row = cw.get(node)
    if (!row) problems.push(`${dataset}: crosswalk.csv içinde "${node}" düğümü yok.`)
    return row
  }
  for (const r of HRA_RECORDS) {
    for (const e of r.evidence) {
      const row = rowOf(e.dataset, e.node)
      if (row && (row.ontologyId !== e.ontologyId || row.label !== e.label))
        problems.push(`${e.dataset} ${e.node}: katalog ${e.ontologyId} "${e.label}", crosswalk ${row.ontologyId} "${row.label}".`)
    }
  }
  const records = new Set(HRA_RECORDS.map((r) => r.id))
  for (const n of HRA_NODES) {
    if (!records.has(n.structureId)) problems.push(`${n.node}: "${n.structureId}" için katalog kaydı yok.`)
    const row = rowOf(n.dataset, n.node)
    if (row && row.ontologyId !== ontologyIdFromStructureId(n.structureId))
      problems.push(`${n.dataset} ${n.node}: katalog ${ontologyIdFromStructureId(n.structureId)}, crosswalk ${row.ontologyId}.`)
  }
  return problems
}

// ------------------------------------------------------------------------------ geometry

/** Side named by an HRA node ("VH_F_left_ovary", "VH_F_mesovarium_L"), or null. */
export function sideOfNode(node: string): 'left' | 'right' | null {
  const tokens = node.toLowerCase().split('_')
  const last = tokens[tokens.length - 1]
  const left = tokens.includes('left') || last === 'l'
  const right = tokens.includes('right') || last === 'r'
  if (left === right) return null
  return left ? 'left' : 'right'
}

/** Node name without its side token, used to pair left/right nodes. */
export function sideNeutralNode(node: string): string {
  const tokens = node.toLowerCase().split('_')
  if (tokens[tokens.length - 1] === 'l' || tokens[tokens.length - 1] === 'r') tokens.pop()
  return tokens.filter((t) => t !== 'left' && t !== 'right').join('_')
}

/**
 * Source triangles in the app frame, welded (exact duplicate positions after float32 rounding),
 * without degenerate triangles, with area-weighted normals.
 */
export function prepareHraMesh(positions: Float64Array, indices: Uint32Array): IndexedMesh & { degenerateRemoved: number } {
  const count = positions.length / 3
  const remap = new Int32Array(count).fill(-1)
  const keyToIndex = new Map<string, number>()
  const out: number[] = []
  const f32 = new Float32Array(3)
  for (let v = 0; v < count; v++) {
    const [x, y, z] = hraToApp([positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!])
    f32[0] = x
    f32[1] = y
    f32[2] = z
    const key = `${f32[0]},${f32[1]},${f32[2]}`
    let idx = keyToIndex.get(key)
    if (idx === undefined) {
      idx = out.length / 3
      keyToIndex.set(key, idx)
      out.push(f32[0], f32[1], f32[2])
    }
    remap[v] = idx
  }
  const idx: number[] = []
  let degenerate = 0
  for (let t = 0; t < indices.length; t += 3) {
    const a = remap[indices[t]!]!
    const b = remap[indices[t + 1]!]!
    const c = remap[indices[t + 2]!]!
    if (a === b || b === c || a === c) {
      degenerate++
      continue
    }
    idx.push(a, b, c)
  }
  const pos = Float32Array.from(out)
  const ind = Uint32Array.from(idx)
  return { positions: pos, indices: ind, normals: computeVertexNormals(pos, ind), degenerateRemoved: degenerate }
}

export interface Midline {
  x: number
  pairs: number
  method: 'left-right-pairs' | 'overall-bbox-center'
}

/** Median midpoint of left/right node pairs (the HRA body is not centred on x = 0). */
export function measureHraMidline(items: readonly { node: string; centroid: Vec3; bbox: MeshStats['bbox'] }[]): Midline {
  const bySide = { left: new Map<string, number>(), right: new Map<string, number>() }
  for (const it of items) {
    const side = sideOfNode(it.node)
    if (side) bySide[side].set(sideNeutralNode(it.node), it.centroid[0])
  }
  const mids: number[] = []
  for (const [key, xl] of bySide.left) {
    const xr = bySide.right.get(key)
    if (xr !== undefined) mids.push((xl + xr) / 2)
  }
  if (mids.length > 0) {
    mids.sort((a, b) => a - b)
    const m = mids.length >> 1
    return { x: mids.length % 2 ? mids[m]! : (mids[m - 1]! + mids[m]!) / 2, pairs: mids.length, method: 'left-right-pairs' }
  }
  const min = Math.min(...items.map((i) => i.bbox[0]))
  const max = Math.max(...items.map((i) => i.bbox[3]))
  return { x: (min + max) / 2, pairs: 0, method: 'overall-bbox-center' }
}

export function lateralityCheck(node: string, centroidX: number, midline: Midline, toleranceM: number, meta: { tool: string; date: string }): AutomatedCheck | null {
  const side = sideOfNode(node)
  if (!side) return null
  const offset = centroidX - midline.x
  const observed = Math.abs(offset) <= toleranceM ? 'midline' : offset > 0 ? 'left' : 'right'
  const where = `ağırlık merkezi X = ${round(centroidX, 4)} m, orta hat X = ${round(midline.x, 4)} m, fark = ${round(offset * 1000, 1)} mm`
  if (observed === side) return { check: 'laterality-centroid-sign', ...meta, result: 'pass', details: `Düğüm adı "${side}"; ${where}.` }
  if (observed === 'midline')
    return { check: 'laterality-centroid-sign', ...meta, result: 'partial', details: `Düğüm adı "${side}" ama merkez orta hat toleransında; ${where}.` }
  return {
    check: 'laterality-centroid-sign',
    ...meta,
    result: 'fail',
    details: `UYUMSUZLUK: düğüm adı "${side}", geometri ${observed === 'left' ? 'sol (+X)' : 'sağ (−X)'} tarafta; ${where}. Düğüm derlemeye alınmadı.`,
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Hard frame checks; each returns pass/fail with the measured values. */
export function frameChecks(centroids: ReadonlyMap<string, Vec3>, meta: { tool: string; date: string }): AutomatedCheck[] {
  const pick = (nodes: readonly string[], axis: 0 | 1 | 2) => nodes.map((n) => centroids.get(n)?.[axis]).filter((v): v is number => v !== undefined)
  const compare = (check: string, hi: number[], lo: number[], text: string): AutomatedCheck => {
    if (hi.length === 0 || lo.length === 0) return { check, ...meta, result: 'fail', details: `${text}: karşılaştırılacak düğüm yok.` }
    const a = median(hi)
    const b = median(lo)
    return { check, ...meta, result: a > b ? 'pass' : 'fail', details: `${text}: ${round(a, 4)} m > ${round(b, 4)} m olmalı.` }
  }
  const F = FRAME_CHECK_NODES
  return [
    compare('ovary-left-right', pick([F.leftOvary], 0), pick([F.rightOvary], 0), '+X deneğin solu: sol over X > sağ over X'),
    compare('frame-axis-superior', pick(F.superior, 1), pick(F.inferior, 1), '+Y süperior: over/tuba medyan Y > serviks medyan Y'),
    compare('frame-axis-anterior', pick(F.anterior, 2), pick(F.posterior, 2), '+Z anterior: uterovezikal çıkmaz Z > uterosakral bağlar Z'),
  ]
}

// ------------------------------------------------------------------------------ pipeline

export interface HraBuildOptions {
  vendorDir: string
  datasets: DatasetFiles[]
  manifest: HraManifest
  modelsDir: string
  /** assets-hra.json output directory (public/data). */
  dataDir: string
  modelsUrlPrefix: string
  date: string
  config?: HraBuildConfig
  log?: (m: string) => void
}

export interface HraNodeReport {
  node: string
  dataset: string
  structureId: string
  asset: HraAssetKey
  built: boolean
  excludedReason: string | null
  sourceTriangles: number
  triangles: number | null
  bbox: MeshStats['bbox']
  centroid: Vec3
  side: 'left' | 'right' | null
  checks: AutomatedCheck[]
}

export interface HraBuildReport {
  date: string
  frameConversion: string
  midline: Midline
  checks: AutomatedCheck[]
  nodes: HraNodeReport[]
  excluded: { dataset: string; node: string; reason: string; bbox?: MeshStats['bbox'] }[]
  assets: { id: string; nodes: number; sourceTriangles: number; triangles: number; bytes: number; budget: number }[]
}

export interface HraBuildResult {
  assets: ModelAsset[]
  report: HraBuildReport
  written: string[]
}

function openDataset(files: DatasetFiles): { layout: GlbLayout; src: ByteSource; table: NodeInfo[] } {
  if (files.glb.mode === 'full') {
    const bytes = new Uint8Array(readFileSync(files.glb.path))
    const layout = parseGlbLayout(bytes)
    return { layout, src: bytesSource(bytes), table: nodeTable(layout.json) }
  }
  const prefix = new Uint8Array(readFileSync(files.glb.prefixPath))
  const layout = parseGlbLayout(prefix)
  const src = rangesSource([{ start: 0, bytes: prefix }, ...files.glb.ranges.map((r) => ({ start: r.start, bytes: new Uint8Array(readFileSync(r.path)) }))])
  return { layout, src, table: nodeTable(layout.json) }
}

const roundVec = (v: readonly number[]): Vec3 => [round(v[0]!), round(v[1]!), round(v[2]!)]
const roundBbox = (b: MeshStats['bbox']): MeshStats['bbox'] => [round(b[0]), round(b[1]), round(b[2]), round(b[3]), round(b[4]), round(b[5])]

export async function buildHra(opts: HraBuildOptions): Promise<HraBuildResult> {
  const config = opts.config ?? HRA_BUILD_CONFIG
  const log = opts.log ?? (() => {})
  const meta = { tool: HRA_BUILD_TOOL, date: opts.date }
  const byName = new Map(opts.datasets.map((d) => [d.dataset.name, d]))

  // 1. Catalogue vs crosswalks.
  const crosswalks = new Map([...byName].map(([name, d]) => [name, parseCrosswalk(readFileSync(d.crosswalkPath, 'utf8'))]))
  const problems = verifyCatalog(crosswalks)
  if (problems.length > 0) {
    throw new Error(`Katalog HRA crosswalk dosyalarıyla uyuşmuyor (HRA verisi değişmiş olabilir; ids/etiketler elle kontrol edilmeden güncellenmez):\n  ${problems.join('\n  ')}`)
  }

  // 2. Geometry.
  const opened = new Map<string, ReturnType<typeof openDataset>>()
  const open = (name: string) => {
    let o = opened.get(name)
    if (!o) {
      const files = byName.get(name)
      if (!files) throw new Error(`HRA veri kümesi indirilmemiş: ${name}`)
      o = openDataset(files)
      opened.set(name, o)
    }
    return o
  }
  interface Prepared {
    cat: CatalogNode
    mesh: IndexedMesh
    stats: MeshStats
    sourceTriangles: number
  }
  const prepared: Prepared[] = []
  for (const cat of HRA_NODES) {
    const { layout, src, table } = open(cat.dataset)
    const raw = readNodeMesh(layout, src, findNode(table, cat.node))
    const mesh = prepareHraMesh(raw.positions, raw.indices)
    if (mesh.indices.length === 0) throw new Error(`${cat.node}: geometri boş.`)
    prepared.push({ cat, mesh, stats: meshStats(mesh.positions, mesh.indices), sourceTriangles: raw.indices.length / 3 })
  }
  const excluded: HraBuildReport['excluded'] = []
  for (const x of HRA_EXCLUDED_NODES) {
    let bbox: MeshStats['bbox'] | undefined
    try {
      const { layout, src, table } = open(x.dataset)
      const info = findNode(table, x.node)
      if (info.mesh !== null && x.dataset !== 'united-female') {
        const raw = readNodeMesh(layout, src, info)
        const m = prepareHraMesh(raw.positions, raw.indices)
        bbox = roundBbox(meshStats(m.positions, m.indices).bbox)
      }
    } catch {
      // informational only
    }
    excluded.push({ ...x, ...(bbox ? { bbox } : {}) })
  }

  // 3. Checks.
  const centroids = new Map(prepared.map((p) => [p.cat.node, p.stats.centroid]))
  const checks = frameChecks(centroids, meta)
  for (const c of checks) log(`Çerçeve denetimi ${c.check}: ${c.result} — ${c.details}`)
  const failed = checks.filter((c) => c.result !== 'pass')
  if (failed.length > 0) throw new Error(`Koordinat çerçevesi denetimi başarısız: ${failed.map((c) => c.check).join(', ')}. Dönüşüm (source.ts hraToApp) gözden geçirilmeli.`)

  const midline = measureHraMidline(prepared.map((p) => ({ node: p.cat.node, centroid: p.stats.centroid, bbox: p.stats.bbox })))
  log(`Orta hat X = ${round(midline.x, 4)} m (${midline.pairs} sağ/sol düğüm çifti)`)
  const nodeReports = new Map<string, HraNodeReport>()
  for (const p of prepared) {
    const lat = lateralityCheck(p.cat.node, p.stats.centroid[0], midline, config.midlineToleranceM, meta)
    const excludedReason = lat?.result === 'fail' ? `Taraf denetimi başarısız: ${lat.details}` : null
    if (excludedReason) {
      log(`  ! ${p.cat.node}: ${lat!.details}`)
      excluded.push({ dataset: p.cat.dataset, node: p.cat.node, reason: excludedReason, bbox: roundBbox(p.stats.bbox) })
    }
    nodeReports.set(p.cat.node, {
      node: p.cat.node,
      dataset: p.cat.dataset,
      structureId: p.cat.structureId,
      asset: p.cat.asset,
      built: !excludedReason,
      excludedReason,
      sourceTriangles: p.sourceTriangles,
      triangles: null,
      bbox: roundBbox(p.stats.bbox),
      centroid: roundVec(p.stats.centroid),
      side: sideOfNode(p.cat.node),
      checks: lat ? [lat] : [],
    })
  }

  // 4. Assets.
  mkdirSync(opts.modelsDir, { recursive: true })
  mkdirSync(opts.dataDir, { recursive: true })
  const versions = { meshoptimizer: packageVersion('meshoptimizer'), gltfTransform: packageVersion('@gltf-transform/functions') }
  const datasetInfo = opts.datasets.map((d) => ({
    name: d.dataset.name,
    version: d.dataset.version,
    doi: d.metadata.doi,
    citation: d.metadata.citation,
    files: d.files.map((key) => {
      const f = opts.manifest.files[key]!
      return { file: key, url: f.url, sha256: f.sha256, ...(f.range ? { range: `${f.range.start}-${f.range.end}/${f.range.total}` } : {}) }
    }),
  }))
  const fetchedAt = opts.datasets
    .flatMap((d) => d.files.map((k) => opts.manifest.files[k]?.fetchedAt))
    .filter((x): x is string => !!x)
    .sort()[0]

  const assets: ModelAsset[] = []
  const written: string[] = []
  const assetReports: HraBuildReport['assets'] = []
  const produced = new Set<string>()
  for (const key of Object.keys(HRA_ASSETS) as HraAssetKey[]) {
    const def = HRA_ASSETS[key]
    const members = prepared.filter((p) => p.cat.asset === key && nodeReports.get(p.cat.node)!.built)
    if (members.length === 0) continue
    const budget = config.triangleBudget[key]
    const targets = allocateTriangleBudget(
      members.map((m) => ({ id: m.cat.node, triangles: m.mesh.indices.length / 3, protected: false })),
      budget,
      config.minTrianglesPerElement,
    )
    const meshes = new Map<string, IndexedMesh>()
    let reverted = 0
    for (const m of members) {
      const { mesh } = await simplifyMesh(m.mesh, targets.get(m.cat.node)!, config.maxError)
      const rep = nodeReports.get(m.cat.node)!
      if (mesh !== m.mesh) {
        const before = bboxDiagonal(m.stats.bbox)
        const after = mesh.indices.length > 0 ? bboxDiagonal(meshStats(mesh.positions, mesh.indices).bbox) : 0
        const ratio = before > 0 ? after / before : 1
        if (ratio < config.minBboxRatio) {
          rep.checks.push({ check: 'lod-bbox-preserved', ...meta, result: 'partial', details: `Sınır kutusu oranı ${round(ratio, 3)}; tam çözünürlük kullanıldı.` })
          meshes.set(m.cat.node, m.mesh)
          reverted++
          continue
        }
        rep.checks.push({ check: 'lod-bbox-preserved', ...meta, result: 'pass', details: `Sınır kutusu köşegeni oranı ${round(ratio, 3)}` })
      }
      meshes.set(m.cat.node, mesh)
    }
    const sourceTriangles = members.reduce((s, m) => s + m.mesh.indices.length / 3, 0)
    const outTriangles = [...meshes.values()].reduce((s, m) => s + m.indices.length / 3, 0)

    const glb = await writeGlb(
      members.map((m) => ({
        name: m.cat.node,
        mesh: meshes.get(m.cat.node)!,
        extras: { structureId: m.cat.structureId, hraNode: m.cat.node, dataset: m.cat.dataset, ontologyId: ontologyIdFromStructureId(m.cat.structureId) },
      })),
      {
        materialName: 'system:reproductive',
        color: SYSTEM_COLORS.reproductive,
        copyright: DERIVED_ATTRIBUTION,
        generator: `anatomi-3b ${HRA_BUILD_TOOL}`,
        sceneName: def.id,
        sceneExtras: {
          assetId: def.id,
          chunk: def.chunk,
          sourceId: HRA_SOURCE_ID,
          license: HRA_LICENSE.id,
          licenseUrl: HRA_LICENSE.url,
          coordinateFrame: COORDINATE_FRAME_ID,
          registeredToBody: false,
          representation: 'anatomical',
          datasets: datasetInfo.map((d) => `${d.name} ${d.version}`),
        },
        quantizePosition: config.quantization.position,
        quantizeNormal: config.quantization.normal,
        meshoptLevel: config.meshoptLevel,
      },
    )
    const outPath = join(opts.modelsDir, def.file)
    writeFileSync(outPath, glb)
    written.push(outPath)
    produced.add(def.file)

    const nodes = members.map((m) => {
      const mesh = meshes.get(m.cat.node)!
      const s = meshStats(mesh.positions, mesh.indices)
      nodeReports.get(m.cat.node)!.triangles = s.triangles
      return {
        node: m.cat.node,
        structureId: m.cat.structureId,
        elementId: m.cat.node,
        triangles: s.triangles,
        bbox: roundBbox(s.bbox),
        centroid: roundVec(s.centroid),
        protectedFromSimplification: false,
      }
    })
    const usedDatasets = new Set(members.map((m) => m.cat.dataset))
    const asset = assetSchema.parse({
      id: def.id,
      file: `${opts.modelsUrlPrefix}${def.file}`,
      format: 'glb',
      bytes: glb.byteLength,
      sha256: sha256(glb),
      sourceId: HRA_SOURCE_ID,
      coordinateFrame: COORDINATE_FRAME_ID,
      representation: 'anatomical',
      lod: 'detail',
      registeredToBody: false,
      chunk: def.chunk,
      systems: ['reproductive'],
      regions: ['pelvis_perineum'],
      label: def.label,
      nodes,
      provenance: [
        {
          date: fetchedAt ? fetchedAt.slice(0, 10) : opts.date,
          step: 'source',
          tool: 'HRA 3D Reference Object Library (HuBMAP), https://humanatlas.io/3d-reference-library',
          params: { datasets: datasetInfo.filter((d) => usedDatasets.has(d.name)), manifest: 'vendor/hra/manifest.json' },
        },
        { date: opts.date, step: 'parse-glb', tool: 'scripts/models/hra/glb.ts', params: { nodes: members.length, worldTransform: 'applied' } },
        {
          date: opts.date,
          step: 'frame-conversion',
          tool: 'scripts/models/hra/source.ts hraToApp',
          params: {
            from: 'glTF 2.0 (HRA; +Y yukarı, +Z ön, +X sol, metre)',
            to: COORDINATE_FRAME_ID,
            mapping: '(x, y, z) m -> (x, y, z) m (eksenler aynı, ölçek 1, öteleme yok)',
            verifiedBy: checks.map((c) => `${c.check}: ${c.result}`),
            registeredToBody: false,
          },
        },
        { date: opts.date, step: 'weld', tool: 'scripts/models/hra/build.ts prepareHraMesh', params: { toleranceM: 0 } },
        { date: opts.date, step: 'normals', tool: 'scripts/models/lib/mesh.ts computeVertexNormals', params: { method: 'area-weighted, recomputed' } },
        {
          date: opts.date,
          step: 'simplify',
          tool: `meshoptimizer ${versions.meshoptimizer} MeshoptSimplifier.simplify`,
          params: {
            triangleBudget: budget,
            sourceTriangles,
            outputTriangles: outTriangles,
            maxRelativeError: config.maxError,
            minTrianglesPerElement: config.minTrianglesPerElement,
            minBboxRatio: config.minBboxRatio,
            revertedToFullResolution: reverted,
          },
        },
        {
          date: opts.date,
          step: 'quantize-compress',
          tool: `@gltf-transform/functions ${versions.gltfTransform} meshopt() — EXT_meshopt_compression + KHR_mesh_quantization`,
          params: { level: config.meshoptLevel, quantizePosition: config.quantization.position, quantizeNormal: config.quantization.normal, quantizationVolume: 'mesh' },
        },
      ],
      review: { geometry: 'draft' },
    })
    assets.push(asset)
    assetReports.push({ id: def.id, nodes: members.length, sourceTriangles, triangles: outTriangles, bytes: glb.byteLength, budget })
    log(`${def.id}: ${members.length} düğüm, ${sourceTriangles} → ${outTriangles} üçgen (bütçe ${budget}), ${glb.byteLength} bayt`)
  }

  for (const f of existsSync(opts.modelsDir) ? readdirSync(opts.modelsDir) : []) {
    if (f.endsWith('.glb') && !produced.has(f)) rmSync(join(opts.modelsDir, f))
  }
  const assetsPath = join(opts.dataDir, 'assets-hra.json')
  writeFileSync(assetsPath, toJson(assets))
  written.push(assetsPath)

  const report: HraBuildReport = {
    date: opts.date,
    frameConversion: 'identity (glTF 2.0 = anat-gltf-v1; metre)',
    midline,
    checks,
    nodes: [...nodeReports.values()],
    excluded,
    assets: assetReports,
  }
  const reportPath = join(opts.vendorDir, 'build-report.json')
  writeFileSync(reportPath, toJson(report))
  written.push(reportPath)
  return { assets, report, written }
}
