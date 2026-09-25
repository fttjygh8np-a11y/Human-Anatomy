/**
 * Minimal glTF 2.0 binary (GLB) reader for the HRA reference organs.
 *
 * Reads only what the build needs — node hierarchy, world transforms, triangle positions and
 * indices — from any byte source, so the ~375 MB united female file can be used through a handful
 * of HTTP range requests instead of a full download (see ./fetch.ts). Compressed or sparse data
 * (Draco, meshopt, KHR_mesh_quantization, sparse accessors) is rejected with a clear error: the HRA
 * files checked on 2026-09-25 use none of them.
 */

export const GLB_MAGIC = 0x46546c67 // "glTF"
const CHUNK_JSON = 0x4e4f534a // "JSON"
const CHUNK_BIN = 0x004e4942 // "BIN\0"

export interface GltfAccessor {
  bufferView?: number
  byteOffset?: number
  componentType: number
  normalized?: boolean
  count: number
  type: string
  sparse?: unknown
  min?: number[]
  max?: number[]
}
export interface GltfBufferView {
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride?: number
}
export interface GltfPrimitive {
  attributes: Record<string, number>
  indices?: number
  mode?: number
}
export interface GltfNode {
  name?: string
  children?: number[]
  mesh?: number
  matrix?: number[]
  translation?: number[]
  rotation?: number[]
  scale?: number[]
}
export interface GltfJson {
  asset: { version: string; generator?: string; copyright?: string }
  scene?: number
  scenes?: { nodes?: number[] }[]
  nodes?: GltfNode[]
  meshes?: { name?: string; primitives: GltfPrimitive[] }[]
  accessors?: GltfAccessor[]
  bufferViews?: GltfBufferView[]
  buffers?: { byteLength: number; uri?: string }[]
  extensionsUsed?: string[]
  extensionsRequired?: string[]
}

export interface GlbHeader {
  totalLength: number
  jsonLength: number
}

/** First 20 bytes: GLB header + JSON chunk header. */
export function parseGlbHeader(bytes: Uint8Array): GlbHeader {
  if (bytes.byteLength < 20) throw new Error('GLB başlığı eksik (en az 20 bayt gerekir).')
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (dv.getUint32(0, true) !== GLB_MAGIC) throw new Error('Dosya GLB değil (glTF imzası yok).')
  const version = dv.getUint32(4, true)
  if (version !== 2) throw new Error(`Desteklenmeyen GLB sürümü: ${version}`)
  const totalLength = dv.getUint32(8, true)
  const jsonLength = dv.getUint32(12, true)
  if (dv.getUint32(16, true) !== CHUNK_JSON) throw new Error('GLB ilk parçası JSON değil.')
  return { totalLength, jsonLength }
}

/** Bytes needed to read the header, the JSON chunk and the BIN chunk header. */
export function glbPrefixLength(h: GlbHeader): number {
  return 20 + h.jsonLength + 8
}

export interface GlbLayout {
  header: GlbHeader
  json: GltfJson
  /** Absolute file offset of the BIN chunk payload (buffer 0). */
  binOffset: number
  binLength: number
}

/** Parses a GLB prefix (at least `glbPrefixLength` bytes; a whole file also works). */
export function parseGlbLayout(prefix: Uint8Array): GlbLayout {
  const header = parseGlbHeader(prefix)
  const need = glbPrefixLength(header)
  if (prefix.byteLength < need) throw new Error(`GLB ön eki eksik: ${prefix.byteLength} bayt, gereken ${need}.`)
  const json = JSON.parse(new TextDecoder().decode(prefix.subarray(20, 20 + header.jsonLength))) as GltfJson
  const dv = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength)
  const binHeaderAt = 20 + header.jsonLength
  const binLength = dv.getUint32(binHeaderAt, true)
  if (dv.getUint32(binHeaderAt + 4, true) !== CHUNK_BIN) throw new Error('GLB ikinci parçası BIN değil.')
  const required = json.extensionsRequired ?? []
  if (required.length > 0) throw new Error(`GLB zorunlu uzantı kullanıyor (${required.join(', ')}); bu okuyucu desteklemiyor.`)
  if ((json.buffers ?? []).some((b, i) => i > 0 || b.uri !== undefined)) throw new Error('Harici veya birden fazla tampon (buffer) desteklenmiyor.')
  return { header, json, binOffset: binHeaderAt + 8, binLength }
}

/** Random access to the bytes of one GLB file. */
export interface ByteSource {
  read(offset: number, length: number): Uint8Array
}

export function bytesSource(bytes: Uint8Array): ByteSource {
  return {
    read(offset, length) {
      if (offset < 0 || offset + length > bytes.byteLength) throw new Error(`Bayt aralığı dosya dışında: ${offset}+${length}`)
      return bytes.subarray(offset, offset + length)
    },
  }
}

/** A source made of cached byte ranges; reading outside them is an error (fetch them first). */
export function rangesSource(ranges: readonly { start: number; bytes: Uint8Array }[]): ByteSource {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  return {
    read(offset, length) {
      for (const r of sorted) {
        if (offset >= r.start && offset + length <= r.start + r.bytes.byteLength) return r.bytes.subarray(offset - r.start, offset - r.start + length)
      }
      throw new Error(`Bayt aralığı önbellekte yok: ${offset}–${offset + length - 1}. "npm run models:hra" ile yeniden indirin.`)
    },
  }
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
const COMPONENT_BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }

export interface ByteRange {
  start: number
  length: number
}

/** Absolute file byte range covered by an accessor (including stride gaps). */
export function accessorRange(layout: GlbLayout, accessorIndex: number): ByteRange {
  const acc = layout.json.accessors?.[accessorIndex]
  if (!acc) throw new Error(`Erişimci #${accessorIndex} yok.`)
  if (acc.sparse) throw new Error(`Seyrek (sparse) erişimci desteklenmiyor (#${accessorIndex}).`)
  if (acc.bufferView === undefined) throw new Error(`Erişimci #${accessorIndex} bir bufferView'a bağlı değil.`)
  const bv = layout.json.bufferViews?.[acc.bufferView]
  if (!bv) throw new Error(`bufferView #${acc.bufferView} yok.`)
  const elementBytes = (COMPONENTS[acc.type] ?? 0) * (COMPONENT_BYTES[acc.componentType] ?? 0)
  if (elementBytes === 0) throw new Error(`Desteklenmeyen erişimci türü ${acc.type}/${acc.componentType}.`)
  const stride = bv.byteStride ?? elementBytes
  const start = layout.binOffset + (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
  const length = acc.count === 0 ? 0 : stride * (acc.count - 1) + elementBytes
  if ((bv.byteOffset ?? 0) + (acc.byteOffset ?? 0) + length > layout.binLength) throw new Error(`Erişimci #${accessorIndex} BIN parçasının dışına taşıyor.`)
  return { start, length }
}

function readAccessor(layout: GlbLayout, src: ByteSource, accessorIndex: number): { values: Float64Array; components: number } {
  const acc = layout.json.accessors![accessorIndex]!
  if (acc.normalized) throw new Error(`Normalize edilmiş erişimci desteklenmiyor (#${accessorIndex}).`)
  const components = COMPONENTS[acc.type]!
  const cb = COMPONENT_BYTES[acc.componentType]!
  const bv = layout.json.bufferViews![acc.bufferView!]!
  const stride = bv.byteStride ?? components * cb
  const range = accessorRange(layout, accessorIndex)
  const bytes = src.read(range.start, range.length)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out = new Float64Array(acc.count * components)
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < components; c++) {
      const at = i * stride + c * cb
      let v: number
      switch (acc.componentType) {
        case 5126:
          v = dv.getFloat32(at, true)
          break
        case 5125:
          v = dv.getUint32(at, true)
          break
        case 5123:
          v = dv.getUint16(at, true)
          break
        case 5121:
          v = dv.getUint8(at)
          break
        default:
          throw new Error(`Desteklenmeyen bileşen türü ${acc.componentType}`)
      }
      out[i * components + c] = v
    }
  }
  return { values: out, components }
}

// ---------------------------------------------------------------------------------- transforms

export type Mat4 = number[] // column-major, 16 values (glTF convention)

export const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!
  return out
}

/** Local matrix of a node: `matrix`, or T * R * S. */
export function localMatrix(n: GltfNode): Mat4 {
  if (n.matrix) return [...n.matrix]
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale ?? [1, 1, 1]
  const r = [
    1 - 2 * (y! * y! + z! * z!), 2 * (x! * y! + z! * w!), 2 * (x! * z! - y! * w!),
    2 * (x! * y! - z! * w!), 1 - 2 * (x! * x! + z! * z!), 2 * (y! * z! + x! * w!),
    2 * (x! * z! + y! * w!), 2 * (y! * z! - x! * w!), 1 - 2 * (x! * x! + y! * y!),
  ]
  return [
    r[0]! * sx!, r[1]! * sx!, r[2]! * sx!, 0,
    r[3]! * sy!, r[4]! * sy!, r[5]! * sy!, 0,
    r[6]! * sz!, r[7]! * sz!, r[8]! * sz!, 0,
    tx!, ty!, tz!, 1,
  ]
}

export interface NodeInfo {
  index: number
  name: string
  parent: number | null
  world: Mat4
  mesh: number | null
}

/** Every node with its parent and world matrix (roots = nodes that are nobody's child). */
export function nodeTable(json: GltfJson): NodeInfo[] {
  const nodes = json.nodes ?? []
  const parent = new Array<number | null>(nodes.length).fill(null)
  nodes.forEach((n, i) => (n.children ?? []).forEach((c) => (parent[c] = i)))
  const world: (Mat4 | null)[] = new Array<Mat4 | null>(nodes.length).fill(null)
  const worldOf = (i: number, depth = 0): Mat4 => {
    const cached = world[i]
    if (cached) return cached
    if (depth > nodes.length) throw new Error('Düğüm hiyerarşisinde döngü var.')
    const p = parent[i]
    const m = p === null || p === undefined ? localMatrix(nodes[i]!) : multiply(worldOf(p, depth + 1), localMatrix(nodes[i]!))
    world[i] = m
    return m
  }
  return nodes.map((n, i) => ({ index: i, name: n.name ?? `#${i}`, parent: parent[i] ?? null, world: worldOf(i), mesh: n.mesh ?? null }))
}

/** Finds exactly one node by name. */
export function findNode(table: readonly NodeInfo[], name: string): NodeInfo {
  const hits = table.filter((n) => n.name === name)
  if (hits.length === 0) throw new Error(`GLB içinde "${name}" düğümü yok.`)
  if (hits.length > 1) throw new Error(`GLB içinde "${name}" adında ${hits.length} düğüm var; ad benzersiz olmalı.`)
  return hits[0]!
}

/** Byte ranges (positions + indices) needed to read a node's mesh. Normals are not read (recomputed). */
export function meshRanges(layout: GlbLayout, node: NodeInfo): ByteRange[] {
  if (node.mesh === null) return []
  const mesh = layout.json.meshes?.[node.mesh]
  if (!mesh) throw new Error(`Ağ #${node.mesh} yok (düğüm "${node.name}").`)
  const out: ByteRange[] = []
  for (const p of mesh.primitives) {
    const pos = p.attributes.POSITION
    if (pos === undefined) throw new Error(`"${node.name}" ağında POSITION yok.`)
    out.push(accessorRange(layout, pos))
    if (p.indices !== undefined) out.push(accessorRange(layout, p.indices))
  }
  return out
}

/** Merges overlapping/adjacent ranges (gap ≤ maxGap bytes are bridged). */
export function coalesceRanges(ranges: readonly ByteRange[], maxGap = 0): ByteRange[] {
  const sorted = [...ranges].filter((r) => r.length > 0).sort((a, b) => a.start - b.start)
  const out: ByteRange[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r.start <= last.start + last.length + maxGap) {
      last.length = Math.max(last.length, r.start + r.length - last.start)
    } else out.push({ ...r })
  }
  return out
}

export interface TriangleMesh {
  /** World-space positions (source units). */
  positions: Float64Array
  indices: Uint32Array
}

/** Triangles of a node's mesh (all primitives merged) in world space. */
export function readNodeMesh(layout: GlbLayout, src: ByteSource, node: NodeInfo): TriangleMesh {
  if (node.mesh === null) throw new Error(`"${node.name}" düğümünün ağı yok.`)
  const mesh = layout.json.meshes![node.mesh]!
  const m = node.world
  const positions: number[] = []
  const indices: number[] = []
  // Mirroring transforms reverse the winding.
  const det =
    m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!)
  for (const p of mesh.primitives) {
    if ((p.mode ?? 4) !== 4) throw new Error(`"${node.name}" üçgen olmayan ilkel (mode ${p.mode}) içeriyor.`)
    const base = positions.length / 3
    const pos = readAccessor(layout, src, p.attributes.POSITION!)
    if (pos.components !== 3) throw new Error(`"${node.name}" POSITION VEC3 değil.`)
    const v = pos.values
    for (let i = 0; i < v.length; i += 3) {
      const x = v[i]!
      const y = v[i + 1]!
      const z = v[i + 2]!
      positions.push(m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!)
    }
    const idx = p.indices !== undefined ? readAccessor(layout, src, p.indices).values : Float64Array.from({ length: v.length / 3 }, (_, i) => i)
    if (idx.length % 3 !== 0) throw new Error(`"${node.name}" indis sayısı 3'ün katı değil.`)
    for (let i = 0; i < idx.length; i += 3) {
      const a = base + idx[i]!
      const b = base + idx[i + 1]!
      const c = base + idx[i + 2]!
      if (det < 0) indices.push(a, c, b)
      else indices.push(a, b, c)
    }
  }
  return { positions: Float64Array.from(positions), indices: Uint32Array.from(indices) }
}
