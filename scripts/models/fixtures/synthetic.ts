/**
 * Generators for SYNTHETIC test fixtures that mimic the BodyParts3D OBJ layout (comment header with
 * FJ id / FMA id / English name / license line, then `v`, `vn` and `f a//a b//b c//c`).
 *
 * The ids used by the fixtures (FJ90xx, FMA99000xx) are deliberately outside the real ranges and the
 * geometry is made of boxes/spheres: nothing here is BodyParts3D data or an anatomical claim.
 */

export type HeaderStyle = 'bare' | 'keyed' | 'none'

export interface FixtureHeader {
  elementId: string
  fmaId: string | null
  name: string
  style: HeaderStyle
}

type V3 = [number, number, number]

const LICENSE_LINE = 'BodyParts3D, (C) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan'

export function headerLines(h: FixtureHeader): string[] {
  const out = ['# SYNTHETIC TEST FIXTURE - not BodyParts3D data (mimics the BP3D 4.0 OBJ layout)']
  if (h.style === 'none') return out
  out.push(`# ${LICENSE_LINE}`)
  if (h.style === 'bare') {
    out.push(`# ${h.elementId}`)
    if (h.fmaId) out.push(`# FMA${h.fmaId}`)
    out.push(`# ${h.name}`)
  } else {
    out.push(`# FJ ID: ${h.elementId}`)
    if (h.fmaId) out.push(`# FMA ID: FMA${h.fmaId}`)
    out.push(`# English name: ${h.name}`)
    out.push('# Japanese name: (not included in fixture)')
  }
  return out
}

function fmt(n: number): string {
  return Number(n.toFixed(4)).toString()
}

/** Triangle list OBJ with per-vertex normals (`f a//a b//b c//c`, BodyParts3D style). */
export function trianglesObj(header: FixtureHeader, verts: V3[], normals: V3[], tris: [number, number, number][]): string {
  const lines = headerLines(header)
  for (const v of verts) lines.push(`v ${fmt(v[0])} ${fmt(v[1])} ${fmt(v[2])}`)
  for (const n of normals) lines.push(`vn ${fmt(n[0])} ${fmt(n[1])} ${fmt(n[2])}`)
  for (const [a, b, c] of tris) lines.push(`f ${a + 1}//${a + 1} ${b + 1}//${b + 1} ${c + 1}//${c + 1}`)
  return `${lines.join('\n')}\n`
}

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Outward-facing triangles: flips any triangle whose normal points toward `center`. */
function orient(verts: V3[], tris: [number, number, number][], center: V3): [number, number, number][] {
  return tris.map(([a, b, c]) => {
    const p = verts[a]!
    const q = verts[b]!
    const r = verts[c]!
    const e1: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]
    const e2: V3 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]]
    const n: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const m: V3 = [(p[0] + q[0] + r[0]) / 3 - center[0], (p[1] + q[1] + r[1]) / 3 - center[1], (p[2] + q[2] + r[2]) / 3 - center[2]]
    return n[0] * m[0] + n[1] * m[1] + n[2] * m[2] >= 0 ? [a, b, c] : [a, c, b]
  })
}

/** Closed triangle mesh; winding is made outward and normals point away from the vertex mean. */
export function closedMeshObj(header: FixtureHeader, verts: V3[], tris: [number, number, number][]): string {
  const center: V3 = [0, 1, 2].map((k) => verts.reduce((s, v) => s + v[k]!, 0) / verts.length) as V3
  const normals = verts.map((v) => norm([v[0] - center[0], v[1] - center[1], v[2] - center[2]]))
  return trianglesObj(header, verts, normals, orient(verts, tris, center))
}

/** Axis-aligned box (min/max in source millimetres). */
export function boxObj(header: FixtureHeader, min: V3, max: V3): string {
  const verts: V3[] = []
  for (let i = 0; i < 8; i++) verts.push([i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]])
  const center: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const quads = [
    [0, 1, 3, 2],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 3, 7, 5],
  ]
  const tris: [number, number, number][] = []
  for (const [a, b, c, d] of quads) tris.push([a!, b!, c!], [a!, c!, d!])
  const normals = verts.map((v) => norm([v[0] - center[0], v[1] - center[1], v[2] - center[2]]))
  return trianglesObj(header, verts, normals, orient(verts, tris, center))
}

/**
 * UV sphere with duplicated seam and pole vertices (as many exporters write them), so welding and
 * degenerate-triangle removal are exercised. Triangles = 2 × rings × segments.
 */
export function sphereObj(header: FixtureHeader, center: V3, radius: number, rings: number, segments: number): string {
  const verts: V3[] = []
  const normals: V3[] = []
  for (let r = 0; r <= rings; r++) {
    const theta = (Math.PI * r) / rings
    for (let s = 0; s <= segments; s++) {
      const phi = (2 * Math.PI * s) / segments
      const n: V3 = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)]
      verts.push([center[0] + radius * n[0], center[1] + radius * n[1], center[2] + radius * n[2]])
      normals.push(n)
    }
  }
  const tris: [number, number, number][] = []
  const row = segments + 1
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * row + s
      const b = a + 1
      const c = a + row
      const d = c + 1
      tris.push([a, c, b], [b, c, d])
    }
  }
  return trianglesObj(header, verts, normals, orient(verts, tris, center))
}
