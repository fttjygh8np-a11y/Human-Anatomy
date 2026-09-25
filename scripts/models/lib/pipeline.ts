/**
 * BodyParts3D -> chunked GLB build (see docs/model-katalogu.md).
 *
 * Pass 1 parses every OBJ once to build the element inventory (ids, names, geometry statistics,
 * classification, laterality checks). Pass 2 re-parses the elements chunk by chunk, simplifies them
 * to the base LOD budget and writes base/detail GLBs, so memory stays bounded by the largest chunk.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { assetSchema, COORDINATE_FRAME_ID, TOP_REGION_IDS } from '../../../src/core/schema.ts'
import type { AutomatedCheck, ModelAsset, SystemId } from '../../../src/core/schema.ts'
import type { ModelBuildConfig } from '../config.ts'
import { checkFrameAxes, checkLaterality, classifyElement, measureMidline } from './classify.ts'
import type { Classification, MidlineEstimate, TopRegionId } from './classify.ts'
import { writeGlb } from './glb.ts'
import { INVENTORY_VERSION, inventorySchema } from './inventory.ts'
import type { Inventory, InventoryElement } from './inventory.ts'
import { REGION_LABELS, SYSTEM_COLORS, SYSTEM_LABELS } from './labels.ts'
import { allocateTriangleBudget, bboxDiagonal, meshStats, prepareMesh, simplifyMesh } from './mesh.ts'
import type { IndexedMesh, MeshStats } from './mesh.ts'
import { parseObj } from './obj.ts'
import type { ObjHeader } from './obj.ts'
import { loadRelationFiles } from './relations.ts'
import type { RelationData } from './relations.ts'
import { BP3D_SOURCE_ID, BP3D_VERSION, DERIVED_LICENSE } from './source.ts'
import { naturalCompare, packageVersion, round, sha256, toJson } from './util.ts'

export const BUILD_TOOL = 'scripts/models/build-models.ts'

export interface BuildOptions {
  /** Directory holding the extracted OBJ files (any depth) and the relation .txt files (top level). */
  inputDir: string
  /** GLB output directory, e.g. public/models/bp3d. */
  modelsDir: string
  /** assets.json output directory, e.g. public/data. */
  dataDir: string
  /** elements.json / build-report.json output directory, e.g. vendor/bodyparts3d. */
  inventoryDir: string
  /** URL path prefix of modelsDir relative to the app base, e.g. "models/bp3d/". */
  modelsUrlPrefix: string
  /** Provenance date (YYYY-MM-DD). */
  date: string
  config: ModelBuildConfig
  log?: (message: string) => void
}

export interface ChunkReport {
  chunk: string
  elements: number
  sourceTriangles: number
  budget: number
  baseTriangles: number
  budgetMet: boolean
  detailTriangles: number | null
  baseAsset: string
  detailAsset: string | null
  baseBytes: number
  detailBytes: number | null
}

export interface BuildReport {
  date: string
  objFiles: number
  sourceArchive: { name: string; sha256: string | null; fetchedAt: string | null } | null
  counts: {
    elements: number
    built: number
    skipped: number
    withFmaId: number
    classifiedByHierarchy: number
    classifiedByHeuristic: number
    unclassified: number
    regionByHierarchy: number
    regionByHeuristic: number
    regionUnassigned: number
    protected: number
    windingFlipped: number
  }
  midline: MidlineEstimate
  /** Superior/anterior axis sanity checks of the converted frame. */
  frameChecks: AutomatedCheck[]
  laterality: { pass: number; partial: number; fail: number; failures: { elementId: string; name: string | null; details: string }[] }
  lodChecks: { reverted: { elementId: string; details: string }[] }
  chunks: ChunkReport[]
  skipped: { elementId: string; sourceFile: string; reason: string }[]
  duplicates: { elementId: string; kept: string; ignored: string }[]
  licenseStatements: { text: string; files: number }[]
  relationFiles: RelationData['files']
}

export interface BuildResult {
  assets: ModelAsset[]
  inventory: Inventory
  report: BuildReport
  /** Written files (absolute paths). */
  written: string[]
}

interface ElementRecord {
  file: string
  sourceFile: string
  sourceSha256: string
  header: ObjHeader
  elementId: string
  nameEn: string | null
  nameSource: InventoryElement['nameSource']
  parseWarnings: string[]
  prep: Omit<ReturnType<typeof prepareMesh>, 'mesh'> | null
  stats: MeshStats | null
  classification: Classification
  structureId: string | null
  protectedReason: string | null
  skipped: string | null
  checks: AutomatedCheck[]
  laterality: InventoryElement['laterality']
  lods: InventoryElement['lods']
}

function listObjFiles(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    const entries = readdirSync(d, { withFileTypes: true }).sort((a, b) => naturalCompare(a.name, b.name))
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && e.name.toLowerCase().endsWith('.obj')) out.push(p)
    }
  }
  walk(dir)
  return out
}

/** Forward-slash path relative to `root`, for platform-independent output. */
function relPath(root: string, p: string): string {
  return relative(root, p).split(sep).join('/')
}

function readManifest(inputDir: string): BuildReport['sourceArchive'] {
  const path = join(inputDir, 'manifest.json')
  if (!existsSync(path)) return null
  try {
    const m = JSON.parse(readFileSync(path, 'utf8')) as {
      files?: Record<string, { sha256?: string; fetchedAt?: string | null }>
    }
    const zipName = Object.keys(m.files ?? {})
      .filter((n) => n.toLowerCase().endsWith('.zip'))
      .sort(naturalCompare)[0]
    if (!zipName) return null
    const f = m.files![zipName]!
    return { name: zipName, sha256: f.sha256 ?? null, fetchedAt: f.fetchedAt ?? null }
  } catch {
    return null
  }
}

function roundBbox(b: MeshStats['bbox']): MeshStats['bbox'] {
  return [round(b[0]), round(b[1]), round(b[2]), round(b[3]), round(b[4]), round(b[5])]
}

function roundVec(v: readonly [number, number, number]): [number, number, number] {
  return [round(v[0]), round(v[1]), round(v[2])]
}

function chunkParts(chunk: string): { system: SystemId; region: TopRegionId | null; regionKey: string } {
  const [system, regionKey] = chunk.split('/') as [SystemId, string]
  const region = (TOP_REGION_IDS as readonly string[]).includes(regionKey) ? (regionKey as TopRegionId) : null
  return { system, region, regionKey }
}

function chunkAssetId(chunk: string, lod: 'base' | 'detail'): string {
  const { system, regionKey } = chunkParts(chunk)
  return `asset:bp3d.${system}.${regionKey}${lod === 'detail' ? '.detail' : ''}`
}

function chunkFileName(chunk: string, lod: 'base' | 'detail'): string {
  const { system, regionKey } = chunkParts(chunk)
  return `${system}.${regionKey}${lod === 'detail' ? '.detail' : ''}.glb`
}

function protectedReasonFor(name: string | null, fmaId: string | null, config: ModelBuildConfig): string | null {
  if (fmaId && config.protectedFmaIds.includes(fmaId)) return `FMA${fmaId} yapılandırmada korunuyor`
  if (!name) return null
  for (const rule of config.protected) if (new RegExp(rule.pattern, 'i').test(name)) return rule.reason
  return null
}

export async function buildModels(opts: BuildOptions): Promise<BuildResult> {
  const log = opts.log ?? (() => {})
  const { config, date } = opts
  const checkMeta = { tool: BUILD_TOOL, date }

  if (!existsSync(opts.inputDir) || !statSync(opts.inputDir).isDirectory()) {
    throw new Error(`Girdi klasörü bulunamadı: ${opts.inputDir}. Önce "npm run models:fetch" çalıştırın.`)
  }
  const objFiles = listObjFiles(opts.inputDir)
  if (objFiles.length === 0) {
    throw new Error(`${opts.inputDir} altında hiç .obj dosyası yok. Önce "npm run models:fetch" çalıştırın (bkz. docs/model-katalogu.md).`)
  }
  log(`${objFiles.length} OBJ dosyası bulundu.`)

  // ---------------------------------------------------------------- pass 1: inventory
  const records: ElementRecord[] = []
  const byId = new Map<string, ElementRecord>()
  const duplicates: BuildReport['duplicates'] = []
  const skipped: BuildReport['skipped'] = []
  const licenseCounts = new Map<string, number>()

  for (const file of objFiles) {
    const sourceFile = relPath(opts.inputDir, file)
    const buf = readFileSync(file)
    const fileSha = sha256(buf)
    let obj
    try {
      obj = parseObj(buf.toString('utf8'), { fileName: basename(file) })
    } catch (err) {
      const id = basename(file).replace(/\.obj$/i, '')
      skipped.push({ elementId: id, sourceFile, reason: `OBJ ayrıştırılamadı: ${(err as Error).message}` })
      continue
    }
    const elementId = obj.header.elementId ?? basename(file).replace(/\.obj$/i, '')
    const existing = byId.get(elementId)
    if (existing) {
      duplicates.push({ elementId, kept: existing.sourceFile, ignored: sourceFile })
      continue
    }
    if (obj.header.license) licenseCounts.set(obj.header.license, (licenseCounts.get(obj.header.license) ?? 0) + 1)
    const prep = obj.stats.triangleCount > 0 ? prepareMesh(obj, { weldToleranceM: config.weldToleranceM }) : null
    const stats = prep && prep.mesh.indices.length > 0 ? meshStats(prep.mesh.positions, prep.mesh.indices) : null
    const rec: ElementRecord = {
      file,
      sourceFile,
      sourceSha256: fileSha,
      header: obj.header,
      elementId,
      nameEn: obj.header.name,
      nameSource: obj.header.nameSource,
      parseWarnings: obj.stats.warnings,
      prep: prep
        ? {
            sourceVertices: prep.sourceVertices,
            sourceTriangles: prep.sourceTriangles,
            weldedVertices: prep.weldedVertices,
            degenerateTrianglesRemoved: prep.degenerateTrianglesRemoved,
            windingFlipped: prep.windingFlipped,
          }
        : null,
      stats,
      classification: classifyElement({ name: null, fmaId: null, elementId: null }, null),
      structureId: null,
      protectedReason: null,
      skipped: null,
      checks: [],
      laterality: { fromName: null, observed: 'midline', offsetXM: 0 },
      lods: { base: null, detail: null },
    }
    records.push(rec)
    byId.set(elementId, rec)
  }
  records.sort((a, b) => naturalCompare(a.elementId, b.elementId))

  const fmaIds = new Set(records.map((r) => r.header.fmaId).filter((x): x is string => x !== null))
  const relations = loadRelationFiles(opts.inputDir, fmaIds)
  const hasRelations = relations.files.some((f) => f.kind !== 'other')
  log(`İlişki dosyaları: ${relations.files.map((f) => f.name).join(', ') || 'yok (yalnızca ad sezgileri kullanılacak)'}`)

  for (const r of records) {
    const fma = r.header.fmaId
    if (!r.nameEn && fma && relations.conceptNames.has(fma)) {
      r.nameEn = relations.conceptNames.get(fma)!
      r.nameSource = 'relation-file'
    }
    r.classification = classifyElement({ name: r.nameEn, fmaId: fma, elementId: r.elementId }, hasRelations ? relations : null)
    r.structureId = fma ? `fma:${fma}` : config.includeElementsWithoutFma ? `ax:bp3d-${r.elementId}` : null
    r.protectedReason = protectedReasonFor(r.nameEn, fma, config)
    r.checks.push({
      check: 'fma-id-present',
      tool: BUILD_TOOL,
      date,
      result: fma ? 'pass' : 'fail',
      details: fma ? `OBJ başlığında FMA${fma}` : 'OBJ başlığında FMA kimliği bulunamadı',
    })
    if (!r.stats) r.skipped = 'geometri yok (üçgen bulunamadı)'
    else if (!r.structureId) r.skipped = 'FMA kimliği yok (includeElementsWithoutFma kapalı)'
    else if (!r.classification.system) r.skipped = 'sistem belirlenemedi (sınıflandırılmadı)'
  }

  // Midline and laterality checks (on every element with geometry, built or not).
  const withGeometry = records.filter((r) => r.stats)
  const midline = measureMidline(
    withGeometry.map((r) => ({ name: r.nameEn, centroidX: r.stats!.centroid[0], bboxMinX: r.stats!.bbox[0], bboxMaxX: r.stats!.bbox[3] })),
    config.midline.xOverrideM,
  )
  log(`Orta hat X = ${round(midline.x, 4)} m (${midline.method}, ${midline.pairs} sağ/sol çift)`)
  for (const r of withGeometry) {
    const lat = checkLaterality(r.nameEn, r.stats!.centroid[0], midline, config.midline.toleranceM, checkMeta)
    r.laterality = { fromName: lat.fromName, observed: lat.observed, offsetXM: round(lat.offsetX) }
    if (lat.check) r.checks.push(lat.check)
  }
  const frameChecks = checkFrameAxes(
    withGeometry.map((r) => ({ name: r.nameEn, centroid: r.stats!.centroid })),
    checkMeta,
  )
  for (const c of frameChecks) log(`Çerçeve denetimi ${c.check}: ${c.result} — ${c.details ?? ''}`)

  // ---------------------------------------------------------------- pass 2: chunks
  const chunks = new Map<string, ElementRecord[]>()
  for (const r of records) {
    if (r.skipped) {
      skipped.push({ elementId: r.elementId, sourceFile: r.sourceFile, reason: r.skipped })
      continue
    }
    const key = r.classification.chunk!
    const list = chunks.get(key)
    if (list) list.push(r)
    else chunks.set(key, [r])
  }
  const chunkKeys = [...chunks.keys()].sort(naturalCompare)

  mkdirSync(opts.modelsDir, { recursive: true })
  mkdirSync(opts.dataDir, { recursive: true })
  mkdirSync(opts.inventoryDir, { recursive: true })

  const manifest = readManifest(opts.inputDir)
  const versions = {
    meshoptimizer: packageVersion('meshoptimizer'),
    gltfTransform: packageVersion('@gltf-transform/functions'),
  }
  const assets: ModelAsset[] = []
  const chunkReports: ChunkReport[] = []
  const reverted: BuildReport['lodChecks']['reverted'] = []
  const written: string[] = []
  const producedFiles = new Set<string>()

  for (const chunk of chunkKeys) {
    const members = chunks.get(chunk)!
    const { system, region, regionKey } = chunkParts(chunk)
    const budget = config.lod.base.chunkBudgets[chunk] ?? config.lod.base.defaultTriangleBudget

    // Re-parse and prepare the chunk's meshes.
    const full = new Map<string, IndexedMesh>()
    for (const r of members) {
      const obj = parseObj(readFileSync(r.file, 'utf8'), { fileName: basename(r.file) })
      full.set(r.elementId, prepareMesh(obj, { weldToleranceM: config.weldToleranceM }).mesh)
    }
    const targets = allocateTriangleBudget(
      members.map((r) => ({ id: r.elementId, triangles: full.get(r.elementId)!.indices.length / 3, protected: r.protectedReason !== null })),
      budget,
      config.lod.base.minTrianglesPerElement,
    )

    const baseMeshes = new Map<string, IndexedMesh>()
    for (const r of members) {
      const mesh = full.get(r.elementId)!
      const target = targets.get(r.elementId)!
      const { mesh: simplified } = await simplifyMesh(mesh, target, config.lod.base.maxError)
      if (simplified !== mesh) {
        const before = bboxDiagonal(r.stats!.bbox)
        const after = bboxDiagonal(meshStats(simplified.positions, simplified.indices).bbox)
        const ratio = before > 0 ? after / before : 1
        if (simplified.indices.length === 0 || ratio < config.lod.base.minBboxRatio) {
          const details = `Sadeleştirme sonrası sınır kutusu köşegeni oranı ${round(ratio, 3)} (< ${config.lod.base.minBboxRatio}) ya da üçgen kalmadı; temel LOD'da tam çözünürlük kullanıldı.`
          r.checks.push({ check: 'lod-bbox-preserved', tool: BUILD_TOOL, date, result: 'partial', details })
          reverted.push({ elementId: r.elementId, details })
          baseMeshes.set(r.elementId, mesh)
          continue
        }
        r.checks.push({
          check: 'lod-bbox-preserved',
          tool: BUILD_TOOL,
          date,
          result: 'pass',
          details: `Temel LOD sınır kutusu köşegeni oranı ${round(ratio, 3)}`,
        })
      }
      baseMeshes.set(r.elementId, simplified)
    }

    const detailMeshes = new Map<string, IndexedMesh>()
    if (config.lod.detail.enabled) {
      for (const r of members) {
        const mesh = full.get(r.elementId)!
        const cap = config.lod.detail.maxTrianglesPerElement
        detailMeshes.set(r.elementId, cap === null ? mesh : (await simplifyMesh(mesh, cap, config.lod.detail.maxError)).mesh)
      }
    }
    const baseTriangles = [...baseMeshes.values()].reduce((s, m) => s + m.indices.length / 3, 0)
    const detailTriangles = [...detailMeshes.values()].reduce((s, m) => s + m.indices.length / 3, 0)
    const sourceTriangles = [...full.values()].reduce((s, m) => s + m.indices.length / 3, 0)
    // A detail asset only makes sense when it actually carries more geometry than the base LOD.
    const writeDetail = config.lod.detail.enabled && detailTriangles > baseTriangles

    const label = {
      tr: `${SYSTEM_LABELS[system].tr} — ${REGION_LABELS[region ?? 'other'].tr}`,
      en: `${SYSTEM_LABELS[system].en} — ${REGION_LABELS[region ?? 'other'].en}`,
    }
    const protectedCount = members.filter((r) => r.protectedReason).length

    const emit = async (lod: 'base' | 'detail', meshes: Map<string, IndexedMesh>): Promise<ModelAsset> => {
      const id = chunkAssetId(chunk, lod)
      const fileName = chunkFileName(chunk, lod)
      const nodes = members.map((r) => ({
        name: r.elementId,
        mesh: meshes.get(r.elementId)!,
        extras: {
          structureId: r.structureId,
          elementId: r.elementId,
          fmaId: r.header.fmaId,
          nameEn: r.nameEn,
          protectedFromSimplification: r.protectedReason !== null,
        },
      }))
      const glb = await writeGlb(nodes, {
        materialName: `system:${system}`,
        color: SYSTEM_COLORS[system],
        copyright: DERIVED_LICENSE.attribution,
        generator: `anatomi-3b ${BUILD_TOOL}`,
        sceneName: id,
        sceneExtras: {
          assetId: id,
          chunk,
          lod,
          sourceId: BP3D_SOURCE_ID,
          sourceVersion: BP3D_VERSION,
          license: DERIVED_LICENSE.id,
          licenseUrl: DERIVED_LICENSE.url,
          coordinateFrame: COORDINATE_FRAME_ID,
          representation: 'anatomical',
        },
        quantizePosition: config.quantization.position,
        quantizeNormal: config.quantization.normal,
        meshoptLevel: config.meshoptLevel,
      })
      const outPath = join(opts.modelsDir, fileName)
      writeFileSync(outPath, glb)
      written.push(outPath)
      producedFiles.add(fileName)

      const assetNodes = members.map((r) => {
        const m = meshes.get(r.elementId)!
        const s = meshStats(m.positions, m.indices)
        return {
          node: r.elementId,
          structureId: r.structureId!,
          elementId: r.elementId,
          triangles: s.triangles,
          bbox: roundBbox(s.bbox),
          centroid: roundVec(s.centroid),
          protectedFromSimplification: r.protectedReason !== null,
        }
      })
      for (const n of assetNodes) {
        const r = byId.get(n.node)!
        r.lods[lod] = {
          assetId: id,
          node: n.node,
          triangles: n.triangles,
          ...(lod === 'base' ? { revertedToFullResolution: reverted.some((x) => x.elementId === n.node) } : {}),
        }
      }

      const simplifyStep =
        lod === 'base'
          ? {
              date,
              step: 'simplify-base-lod',
              tool: `meshoptimizer ${versions.meshoptimizer} MeshoptSimplifier.simplify`,
              params: {
                triangleBudget: budget,
                sourceTriangles,
                outputTriangles: baseTriangles,
                maxRelativeError: config.lod.base.maxError,
                minTrianglesPerElement: config.lod.base.minTrianglesPerElement,
                protectedElements: protectedCount,
                minBboxRatio: config.lod.base.minBboxRatio,
              },
            }
          : config.lod.detail.maxTrianglesPerElement === null
            ? { date, step: 'detail-lod-full-resolution', tool: BUILD_TOOL, params: { outputTriangles: detailTriangles } }
            : {
                date,
                step: 'simplify-detail-lod',
                tool: `meshoptimizer ${versions.meshoptimizer} MeshoptSimplifier.simplify`,
                params: {
                  maxTrianglesPerElement: config.lod.detail.maxTrianglesPerElement,
                  maxRelativeError: config.lod.detail.maxError,
                  outputTriangles: detailTriangles,
                },
              }

      const asset = assetSchema.parse({
        id,
        file: `${opts.modelsUrlPrefix}${fileName}`,
        format: 'glb',
        bytes: glb.byteLength,
        sha256: sha256(glb),
        sourceId: BP3D_SOURCE_ID,
        coordinateFrame: COORDINATE_FRAME_ID,
        representation: 'anatomical',
        lod,
        registeredToBody: true,
        ...(lod === 'detail' ? { detailFor: chunkAssetId(chunk, 'base') } : {}),
        chunk,
        systems: [system],
        regions: region ? [region] : [],
        label: lod === 'detail' ? { tr: `${label.tr} (ayrıntılı)`, en: `${label.en} (detail)` } : label,
        nodes: assetNodes,
        provenance: [
          {
            date: manifest?.fetchedAt ? manifest.fetchedAt.slice(0, 10) : date,
            step: 'source',
            tool: `BodyParts3D ${BP3D_VERSION} (DBCLS)`,
            params: {
              archive: manifest?.name ?? null,
              archiveSha256: manifest?.sha256 ?? null,
              fetchedAt: manifest?.fetchedAt ?? null,
              elementFiles: members.length,
              perFileHashes: 'vendor/bodyparts3d/elements.json (sourceSha256)',
            },
          },
          { date, step: 'parse-obj', tool: 'scripts/models/lib/obj.ts', params: { triangulation: 'fan' } },
          {
            date,
            step: 'frame-conversion',
            tool: 'src/core/frame.ts bp3dToApp',
            params: { from: 'bp3d-lps-mm', to: COORDINATE_FRAME_ID, mapping: '(x, y, z) mm -> (x, z, -y) / 1000 m' },
          },
          { date, step: 'weld', tool: 'scripts/models/lib/mesh.ts prepareMesh', params: { toleranceM: config.weldToleranceM } },
          {
            date,
            step: 'normals',
            tool: 'scripts/models/lib/mesh.ts computeVertexNormals',
            params: { method: 'area-weighted, recomputed', winding: 'majority vote against source normals' },
          },
          simplifyStep,
          {
            date,
            step: 'quantize-compress',
            tool: `@gltf-transform/functions ${versions.gltfTransform} meshopt() — EXT_meshopt_compression + KHR_mesh_quantization`,
            params: {
              level: config.meshoptLevel,
              quantizePosition: config.quantization.position,
              quantizeNormal: config.quantization.normal,
              quantizationVolume: 'mesh',
            },
          },
        ],
        review: { geometry: 'draft' },
      })
      return asset
    }

    const baseAsset = await emit('base', baseMeshes)
    assets.push(baseAsset)
    let detailAsset: ModelAsset | null = null
    if (writeDetail) {
      detailAsset = await emit('detail', detailMeshes)
      assets.push(detailAsset)
    }
    chunkReports.push({
      chunk,
      elements: members.length,
      sourceTriangles,
      budget,
      baseTriangles,
      budgetMet: baseTriangles <= budget,
      detailTriangles: writeDetail ? detailTriangles : null,
      baseAsset: baseAsset.id,
      detailAsset: detailAsset?.id ?? null,
      baseBytes: baseAsset.bytes,
      detailBytes: detailAsset?.bytes ?? null,
    })
    log(
      `${chunk}: ${members.length} öğe, kaynak ${sourceTriangles} → temel ${baseTriangles} üçgen (bütçe ${budget})` +
        (writeDetail ? `, ayrıntılı ${detailTriangles}` : '') +
        ` [bölge anahtarı: ${regionKey}]`,
    )
  }

  // Remove GLBs from earlier builds that this build no longer produces.
  for (const f of readdirSync(opts.modelsDir)) {
    if (f.endsWith('.glb') && !producedFiles.has(f)) rmSync(join(opts.modelsDir, f))
  }

  assets.sort((a, b) => naturalCompare(a.id, b.id))
  const assetsPath = join(opts.dataDir, 'assets.json')
  writeFileSync(assetsPath, toJson(assets))
  written.push(assetsPath)

  // ---------------------------------------------------------------- inventory + report
  const toStructureIds = (ids: readonly string[]) => ids.map((id) => `fma:${id}`)
  const inventory = inventorySchema.parse({
    inventoryVersion: INVENTORY_VERSION,
    generatedAt: date,
    sourceId: BP3D_SOURCE_ID,
    sourceVersion: BP3D_VERSION,
    coordinateFrame: COORDINATE_FRAME_ID,
    sourceFrame: 'bp3d-lps-mm',
    midline: { x: round(midline.x), method: midline.method, pairs: midline.pairs },
    relationFiles: relations.files,
    elements: records.map((r) => ({
      elementId: r.elementId,
      fmaId: r.header.fmaId,
      structureId: r.structureId,
      nameEn: r.nameEn,
      nameSource: r.nameSource,
      sourceFile: r.sourceFile,
      sourceSha256: r.sourceSha256,
      headerLicense: r.header.license,
      system: r.classification.system,
      classificationBasis: r.classification.classificationBasis,
      systemEvidence: r.classification.systemEvidence,
      region: r.classification.region,
      regionBasis: r.classification.regionBasis,
      regionEvidence: r.classification.regionEvidence,
      chunk: r.skipped ? null : r.classification.chunk,
      partOfParents: toStructureIds(r.header.fmaId ? (relations.parents.partof.get(r.header.fmaId) ?? []) : []),
      isaParents: toStructureIds(r.header.fmaId ? (relations.parents.isa.get(r.header.fmaId) ?? []) : []),
      laterality: r.laterality,
      geometry:
        r.prep && r.stats
          ? {
              ...r.prep,
              triangles: r.stats.triangles,
              bbox: roundBbox(r.stats.bbox),
              centroid: roundVec(r.stats.centroid),
              areaM2: round(r.stats.areaM2, 8),
            }
          : null,
      protectedFromSimplification: r.protectedReason !== null,
      protectedReason: r.protectedReason,
      lods: r.lods,
      skipped: r.skipped,
      parseWarnings: r.parseWarnings,
      checks: r.checks,
    })),
  })
  const inventoryPath = join(opts.inventoryDir, 'elements.json')
  writeFileSync(inventoryPath, toJson(inventory))
  written.push(inventoryPath)

  const latChecks = records.flatMap((r) => r.checks.filter((c) => c.check === 'laterality-centroid-sign').map((c) => ({ r, c })))
  const count = (pred: (r: ElementRecord) => boolean) => records.filter(pred).length
  const report: BuildReport = {
    date,
    objFiles: objFiles.length,
    sourceArchive: manifest,
    counts: {
      elements: records.length,
      built: count((r) => !r.skipped),
      skipped: skipped.length,
      withFmaId: count((r) => r.header.fmaId !== null),
      classifiedByHierarchy: count((r) => r.classification.classificationBasis === 'hierarchy'),
      classifiedByHeuristic: count((r) => r.classification.classificationBasis === 'heuristic'),
      unclassified: count((r) => r.classification.classificationBasis === 'unclassified'),
      regionByHierarchy: count((r) => r.classification.regionBasis === 'hierarchy'),
      regionByHeuristic: count((r) => r.classification.regionBasis === 'heuristic'),
      regionUnassigned: count((r) => r.classification.regionBasis === 'unassigned'),
      protected: count((r) => r.protectedReason !== null),
      windingFlipped: count((r) => r.prep?.windingFlipped === true),
    },
    midline,
    frameChecks,
    laterality: {
      pass: latChecks.filter((x) => x.c.result === 'pass').length,
      partial: latChecks.filter((x) => x.c.result === 'partial').length,
      fail: latChecks.filter((x) => x.c.result === 'fail').length,
      failures: latChecks
        .filter((x) => x.c.result === 'fail')
        .map((x) => ({ elementId: x.r.elementId, name: x.r.nameEn, details: x.c.details ?? '' })),
    },
    lodChecks: { reverted },
    chunks: chunkReports,
    skipped: skipped.sort((a, b) => naturalCompare(a.elementId, b.elementId)),
    duplicates,
    licenseStatements: [...licenseCounts.entries()].sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0])).map(([text, files]) => ({ text, files })),
    relationFiles: relations.files,
  }
  const reportPath = join(opts.inventoryDir, 'build-report.json')
  writeFileSync(reportPath, toJson(report))
  written.push(reportPath)

  return { assets, inventory, report, written }
}

