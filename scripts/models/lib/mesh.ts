/**
 * Mesh processing: frame conversion, welding, winding/normals, statistics, simplification and
 * triangle-budget allocation. All functions are pure and deterministic.
 */
import { MeshoptSimplifier } from 'meshoptimizer'
import { bp3dToApp } from '../../../src/core/frame.ts'
import type { Vec3 } from '../../../src/core/schema.ts'
import type { ObjMesh } from './obj.ts'

/** Indexed triangle mesh in the app frame (metres). */
export interface IndexedMesh {
  positions: Float32Array<ArrayBuffer>
  indices: Uint32Array<ArrayBuffer>
  normals: Float32Array<ArrayBuffer>
}

export interface MeshStats {
  triangles: number
  vertices: number
  /** [minX, minY, minZ, maxX, maxY, maxZ] in metres. */
  bbox: [number, number, number, number, number, number]
  /** Area-weighted surface centroid (vertex mean when the area is zero). */
  centroid: Vec3
  areaM2: number
}

export interface PrepareResult {
  mesh: IndexedMesh
  sourceVertices: number
  sourceTriangles: number
  weldedVertices: number
  degenerateTrianglesRemoved: number
  /** Triangle winding disagreed with the source normals and was reversed. */
  windingFlipped: boolean
}

/**
 * OBJ (BodyParts3D LPS mm) -> app frame (anat-gltf-v1, metres), welded, with consistent winding and
 * recomputed area-weighted vertex normals.
 *
 * Welding merges vertices whose app-frame positions are identical (toleranceM = 0) or fall into the
 * same grid cell of size toleranceM. Only referenced vertices are kept, in first-use order.
 */
export function prepareMesh(obj: ObjMesh, opts: { weldToleranceM: number }): PrepareResult {
  const srcPos = obj.positions
  const srcCount = srcPos.length / 3
  const app = new Float64Array(srcPos.length)
  for (let i = 0; i < srcCount; i++) {
    const [x, y, z] = bp3dToApp([srcPos[i * 3]!, srcPos[i * 3 + 1]!, srcPos[i * 3 + 2]!])
    app[i * 3] = x
    app[i * 3 + 1] = y
    app[i * 3 + 2] = z
  }

  const tol = opts.weldToleranceM
  const remap = new Int32Array(srcCount).fill(-1)
  const keyToIndex = new Map<string, number>()
  const outPos: number[] = []
  const f32 = new Float32Array(3)
  const weldedIndexOf = (v: number): number => {
    const cached = remap[v]!
    if (cached >= 0) return cached
    f32[0] = app[v * 3]!
    f32[1] = app[v * 3 + 1]!
    f32[2] = app[v * 3 + 2]!
    const key =
      tol > 0
        ? `${Math.round(f32[0] / tol)},${Math.round(f32[1] / tol)},${Math.round(f32[2] / tol)}`
        : `${f32[0]},${f32[1]},${f32[2]}`
    let idx = keyToIndex.get(key)
    if (idx === undefined) {
      idx = outPos.length / 3
      keyToIndex.set(key, idx)
      outPos.push(f32[0], f32[1], f32[2])
    }
    remap[v] = idx
    return idx
  }

  const srcTris = obj.triangles
  const triCount = srcTris.length / 3
  const indices: number[] = []
  const keptSourceTri: number[] = []
  let degenerate = 0
  for (let t = 0; t < triCount; t++) {
    const a = weldedIndexOf(srcTris[t * 3]!)
    const b = weldedIndexOf(srcTris[t * 3 + 1]!)
    const c = weldedIndexOf(srcTris[t * 3 + 2]!)
    if (a === b || b === c || a === c) {
      degenerate++
      continue
    }
    indices.push(a, b, c)
    keptSourceTri.push(t)
  }

  const positions = Float32Array.from(outPos)
  const idx = Uint32Array.from(indices)

  // Winding vote against the source normals (rotated into the app frame like positions).
  let windingFlipped = false
  if (obj.normals && obj.cornerNormals) {
    const n = obj.normals
    const cn = obj.cornerNormals
    let agree = 0
    let disagree = 0
    for (let k = 0; k < keptSourceTri.length; k++) {
      const t = keptSourceTri[k]!
      let sx = 0
      let sy = 0
      let sz = 0
      for (let c = 0; c < 3; c++) {
        const ni = cn[t * 3 + c]!
        if (ni < 0) continue
        // LPS normal (nx, ny, nz) -> app (nx, nz, -ny): same rotation as positions, no scaling.
        sx += n[ni * 3]!
        sy += n[ni * 3 + 2]!
        sz += -n[ni * 3 + 1]!
      }
      const [fx, fy, fz] = faceNormal(positions, idx[k * 3]!, idx[k * 3 + 1]!, idx[k * 3 + 2]!)
      const dot = fx * sx + fy * sy + fz * sz
      if (dot > 0) agree++
      else if (dot < 0) disagree++
    }
    if (disagree > agree) {
      windingFlipped = true
      for (let k = 0; k < idx.length; k += 3) {
        const tmp = idx[k + 1]!
        idx[k + 1] = idx[k + 2]!
        idx[k + 2] = tmp
      }
    }
  }

  return {
    mesh: { positions, indices: idx, normals: computeVertexNormals(positions, idx) },
    sourceVertices: srcCount,
    sourceTriangles: triCount,
    weldedVertices: positions.length / 3,
    degenerateTrianglesRemoved: degenerate,
    windingFlipped,
  }
}

/** Unnormalised face normal (length = 2 × area). */
function faceNormal(p: Float32Array, a: number, b: number, c: number): Vec3 {
  const ax = p[a * 3]!
  const ay = p[a * 3 + 1]!
  const az = p[a * 3 + 2]!
  const e1x = p[b * 3]! - ax
  const e1y = p[b * 3 + 1]! - ay
  const e1z = p[b * 3 + 2]! - az
  const e2x = p[c * 3]! - ax
  const e2y = p[c * 3 + 1]! - ay
  const e2z = p[c * 3 + 2]! - az
  return [e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x]
}

/** Area-weighted smooth vertex normals. Vertices without area get +Y. */
export function computeVertexNormals(positions: Float32Array, indices: Uint32Array): Float32Array<ArrayBuffer> {
  const acc = new Float64Array(positions.length)
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k]!
    const b = indices[k + 1]!
    const c = indices[k + 2]!
    const [nx, ny, nz] = faceNormal(positions, a, b, c)
    for (const v of [a, b, c]) {
      acc[v * 3] = acc[v * 3]! + nx
      acc[v * 3 + 1] = acc[v * 3 + 1]! + ny
      acc[v * 3 + 2] = acc[v * 3 + 2]! + nz
    }
  }
  const out = new Float32Array(positions.length)
  for (let v = 0; v < positions.length / 3; v++) {
    const x = acc[v * 3]!
    const y = acc[v * 3 + 1]!
    const z = acc[v * 3 + 2]!
    const len = Math.hypot(x, y, z)
    if (len > 0) {
      out[v * 3] = x / len
      out[v * 3 + 1] = y / len
      out[v * 3 + 2] = z / len
    } else out[v * 3 + 1] = 1
  }
  return out
}

export function meshStats(positions: Float32Array, indices: Uint32Array): MeshStats {
  const bbox: MeshStats['bbox'] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
  const used = new Uint8Array(positions.length / 3)
  let mx = 0
  let my = 0
  let mz = 0
  let usedCount = 0
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k]!
    if (used[v]) continue
    used[v] = 1
    usedCount++
    const x = positions[v * 3]!
    const y = positions[v * 3 + 1]!
    const z = positions[v * 3 + 2]!
    mx += x
    my += y
    mz += z
    if (x < bbox[0]) bbox[0] = x
    if (y < bbox[1]) bbox[1] = y
    if (z < bbox[2]) bbox[2] = z
    if (x > bbox[3]) bbox[3] = x
    if (y > bbox[4]) bbox[4] = y
    if (z > bbox[5]) bbox[5] = z
  }
  let area = 0
  let cx = 0
  let cy = 0
  let cz = 0
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k]!
    const b = indices[k + 1]!
    const c = indices[k + 2]!
    const [nx, ny, nz] = faceNormal(positions, a, b, c)
    const w = Math.hypot(nx, ny, nz) / 2
    area += w
    cx += (w * (positions[a * 3]! + positions[b * 3]! + positions[c * 3]!)) / 3
    cy += (w * (positions[a * 3 + 1]! + positions[b * 3 + 1]! + positions[c * 3 + 1]!)) / 3
    cz += (w * (positions[a * 3 + 2]! + positions[b * 3 + 2]! + positions[c * 3 + 2]!)) / 3
  }
  if (usedCount === 0) return { triangles: 0, vertices: 0, bbox: [0, 0, 0, 0, 0, 0], centroid: [0, 0, 0], areaM2: 0 }
  const centroid: Vec3 = area > 0 ? [cx / area, cy / area, cz / area] : [mx / usedCount, my / usedCount, mz / usedCount]
  return { triangles: indices.length / 3, vertices: usedCount, bbox, centroid, areaM2: area }
}

export function bboxDiagonal(b: MeshStats['bbox']): number {
  return Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2])
}

/** Drops unreferenced vertices, keeping first-use order. */
export function compactMesh(
  positions: Float32Array,
  indices: Uint32Array,
): { positions: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer> } {
  const remap = new Int32Array(positions.length / 3).fill(-1)
  const out: number[] = []
  const idx = new Uint32Array(indices.length)
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k]!
    let r = remap[v]!
    if (r < 0) {
      r = out.length / 3
      remap[v] = r
      out.push(positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!)
    }
    idx[k] = r
  }
  return { positions: Float32Array.from(out), indices: idx }
}

export interface SimplifyResult {
  mesh: IndexedMesh
  /** Relative error reported by meshoptimizer (fraction of the mesh extent). */
  error: number
}

/**
 * Simplifies towards `targetTriangles` with meshoptimizer, never exceeding `maxError` (relative to
 * the mesh extent). The result may keep more triangles than the target when the error bound is hit.
 * Normals are recomputed on the simplified surface.
 */
export async function simplifyMesh(mesh: IndexedMesh, targetTriangles: number, maxError: number): Promise<SimplifyResult> {
  const triangles = mesh.indices.length / 3
  if (targetTriangles >= triangles) return { mesh, error: 0 }
  await MeshoptSimplifier.ready
  const [out, error] = MeshoptSimplifier.simplify(mesh.indices, mesh.positions, 3, Math.max(3, targetTriangles * 3), maxError)
  const compact = compactMesh(mesh.positions, out)
  return {
    mesh: { positions: compact.positions, indices: compact.indices, normals: computeVertexNormals(compact.positions, compact.indices) },
    error,
  }
}

export interface BudgetItem {
  id: string
  triangles: number
  protected: boolean
}

/**
 * Distributes a chunk's triangle budget over its elements.
 *  - Protected elements keep all their triangles (even when that alone exceeds the budget).
 *  - Every other element keeps at least min(own triangles, minPerElement).
 *  - The rest of the budget is shared in proportion to the source triangle counts.
 * Returns the target triangle count per element id.
 */
export function allocateTriangleBudget(items: BudgetItem[], budget: number, minPerElement: number): Map<string, number> {
  const out = new Map<string, number>()
  const total = items.reduce((s, i) => s + i.triangles, 0)
  if (total <= budget) {
    for (const i of items) out.set(i.id, i.triangles)
    return out
  }
  let remaining = budget
  let open: BudgetItem[] = []
  for (const i of items) {
    if (i.protected) {
      out.set(i.id, i.triangles)
      remaining -= i.triangles
    } else open.push(i)
  }
  // Iteratively pin elements whose proportional share falls below their floor.
  for (;;) {
    const openTotal = open.reduce((s, i) => s + i.triangles, 0)
    const avail = Math.max(0, remaining)
    const pinned: BudgetItem[] = []
    for (const i of open) {
      const floor = Math.min(i.triangles, minPerElement)
      const share = openTotal > 0 ? (avail * i.triangles) / openTotal : 0
      if (share < floor) pinned.push(i)
    }
    if (pinned.length === 0) {
      for (const i of open) {
        const share = openTotal > 0 ? Math.floor((avail * i.triangles) / openTotal) : 0
        out.set(i.id, Math.min(i.triangles, Math.max(share, Math.min(i.triangles, minPerElement))))
      }
      break
    }
    for (const i of pinned) {
      const floor = Math.min(i.triangles, minPerElement)
      out.set(i.id, floor)
      remaining -= floor
    }
    const pinnedIds = new Set(pinned.map((p) => p.id))
    open = open.filter((i) => !pinnedIds.has(i.id))
    if (open.length === 0) break
  }
  return out
}
