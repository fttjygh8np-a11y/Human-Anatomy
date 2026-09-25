/**
 * Wavefront OBJ parser for BodyParts3D element files.
 *
 * BodyParts3D OBJ files start with a comment header that carries the element (FJ) id, the FMA id,
 * the English name and a license statement, followed by `v`, `vn` and `f a//a b//b c//c` lines.
 * The exact header layout of the 4.0 files could not be inspected in this environment, so the
 * header parser is tolerant: it accepts `key: value` lines ("FMA ID: FMA7088", "English name: ...")
 * as well as bare lines ("FJ1234", "FMA7088", "right fifth rib").
 *
 * Geometry: positions/normals as written (source units, BP3D = LPS millimetres); faces in the forms
 * `v`, `v/t`, `v//n`, `v/t/n`, with negative (relative) indices; polygons are fan-triangulated.
 */

export interface ObjHeader {
  /** BodyParts3D element file id, e.g. "FJ1234" (from the header, else from the file name). */
  elementId: string | null
  /** FMA id digits only, e.g. "7088". */
  fmaId: string | null
  /** English name as written in the header. */
  name: string | null
  /** How the name was found: an explicit `name:` key, or a bare comment line (weaker). */
  nameSource: 'header-key' | 'header-line' | null
  /** First comment line that states a license/copyright. */
  license: string | null
  /** Leading comment lines (without the `#`), for provenance/debugging. */
  comments: string[]
}

export interface ObjStats {
  vertexCount: number
  normalCount: number
  faceCount: number
  triangleCount: number
  /** Faces with more than three corners (fan-triangulated). */
  polygonCount: number
  skippedFaces: number
  warnings: string[]
}

export interface ObjMesh {
  header: ObjHeader
  /** xyz triplets in source units. */
  positions: Float64Array
  /** xyz triplets as written (not normalised), or null when the file has none. */
  normals: Float64Array | null
  /** Three 0-based position indices per triangle. */
  triangles: Uint32Array
  /** 0-based normal index per triangle corner (-1 = none), or null when no face references normals. */
  cornerNormals: Int32Array | null
  stats: ObjStats
}

const FJ_RE = /\bFJ\d+\b/
const FMA_RE = /\bFMA[:_ ]?(\d+)\b/i
const LICENSE_RE = /licen[cs]e|copyright|\(c\)|©/i
/** Lines describing the file/tool rather than the element. */
const META_LINE_RE = /wavefront|\bobj\b|created|generated|exported|bodyparts3d|synthetic|fixture|vertices|faces/i
const ASCII_NAME_RE = /^[A-Za-z][A-Za-z0-9 ,.'()\-/]*$/

function parseHeader(commentLines: string[], fileName: string | undefined): ObjHeader {
  let elementId: string | null = null
  /** FMA id from an explicit key ("Concept ID : FMA59763") — wins over ids found in other lines. */
  let fmaId: string | null = null
  let looseFma: string | null = null
  let name: string | null = null
  let nameSource: ObjHeader['nameSource'] = null
  let license: string | null = null
  const candidates: { line: string; afterFma: boolean }[] = []
  let seenFma = false

  for (const line of commentLines) {
    if (!line) continue
    if (license === null && LICENSE_RE.test(line)) {
      license = line
      continue
    }
    const kv = /^([A-Za-z][A-Za-z ()_-]{0,40}?)\s*[:=]\s*(.+)$/.exec(line)
    if (kv) {
      const key = kv[1]!.trim().toLowerCase().replace(/[\s_-]+/g, ' ')
      const value = kv[2]!.trim()
      if (/^(fj|fj id|element|element id|element file id|file id|representation id|id)$/.test(key)) {
        const m = FJ_RE.exec(value)
        if (m && elementId === null) elementId = m[0]
      }
      // "Build-up logic : FMA 3.0 is_a" names the FMA release, not the element's concept.
      if (/^(build up logic|compatibility version|version)$/.test(key)) continue
      if (/^(fma|fma id|fmaid|concept id)$/.test(key)) {
        const m = /(\d+)/.exec(value)
        if (m && fmaId === null) {
          fmaId = m[1]!
          seenFma = true
        }
        continue
      }
      if (/^(english name|name|name en|name \(en\)|en name|english)$/.test(key)) {
        if (name === null && value) {
          name = value
          nameSource = 'header-key'
        }
        continue
      }
      if (/japanese|kanji|name \(ja\)|name ja/.test(key)) continue
      if (FJ_RE.test(value) || FMA_RE.test(value)) {
        // Unknown key carrying ids: still harvest the ids below.
      } else continue
    }
    const fj = FJ_RE.exec(line)
    if (fj && elementId === null) elementId = fj[0]
    const fma = FMA_RE.exec(line)
    if (fma && looseFma === null) {
      looseFma = fma[1]!
      seenFma = true
    }
    if (fj || fma) continue
    if (META_LINE_RE.test(line) || !ASCII_NAME_RE.test(line) || line.length > 200) continue
    candidates.push({ line, afterFma: seenFma })
  }

  if (name === null && candidates.length > 0) {
    const pick = candidates.find((c) => c.afterFma) ?? candidates[0]!
    name = pick.line
    nameSource = 'header-line'
  }
  if (elementId === null && fileName) {
    const m = FJ_RE.exec(fileName)
    if (m) elementId = m[0]
  }
  return { elementId, fmaId: fmaId ?? looseFma, name, nameSource, license, comments: commentLines }
}

function resolveIndex(raw: string, count: number): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n === 0) return -1
  const idx = n > 0 ? n - 1 : count + n
  return idx >= 0 && idx < count ? idx : -1
}

export function parseObj(text: string, opts: { fileName?: string } = {}): ObjMesh {
  const positions: number[] = []
  const normals: number[] = []
  const tris: number[] = []
  const corner: number[] = []
  const headerComments: string[] = []
  const warnings: string[] = []
  let inHeader = true
  let anyNormalRef = false
  let faceCount = 0
  let polygonCount = 0
  let skippedFaces = 0

  const rawLines = text.split(/\r?\n/)
  for (let li = 0; li < rawLines.length; li++) {
    let line = rawLines[li]!
    // Line continuation.
    while (line.endsWith('\\') && li + 1 < rawLines.length) line = line.slice(0, -1) + ' ' + rawLines[++li]!
    line = line.trim()
    if (line === '') continue
    if (line.charCodeAt(0) === 35 /* # */) {
      if (inHeader) headerComments.push(line.replace(/^#+\s?/, '').trim())
      continue
    }
    inHeader = false
    const parts = line.split(/\s+/)
    const tag = parts[0]
    if (tag === 'v') {
      const x = Number(parts[1])
      const y = Number(parts[2])
      const z = Number(parts[3])
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        warnings.push(`satır ${li + 1}: geçersiz köşe koordinatı`)
        positions.push(0, 0, 0) // keep index numbering intact
      } else positions.push(x, y, z)
    } else if (tag === 'vn') {
      const x = Number(parts[1])
      const y = Number(parts[2])
      const z = Number(parts[3])
      normals.push(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0, Number.isFinite(z) ? z : 0)
    } else if (tag === 'f') {
      faceCount++
      const vCount = positions.length / 3
      const nCount = normals.length / 3
      const vi: number[] = []
      const ni: number[] = []
      let bad = false
      for (let k = 1; k < parts.length; k++) {
        const refs = parts[k]!.split('/')
        const v = resolveIndex(refs[0] ?? '', vCount)
        if (v < 0) {
          bad = true
          break
        }
        vi.push(v)
        const nRaw = refs[2]
        if (nRaw !== undefined && nRaw !== '') {
          const n = resolveIndex(nRaw, nCount)
          ni.push(n)
          if (n >= 0) anyNormalRef = true
        } else ni.push(-1)
      }
      if (bad || vi.length < 3) {
        skippedFaces++
        if (warnings.length < 50) warnings.push(`satır ${li + 1}: geçersiz yüz atlandı`)
        continue
      }
      if (vi.length > 3) polygonCount++
      for (let k = 1; k + 1 < vi.length; k++) {
        tris.push(vi[0]!, vi[k]!, vi[k + 1]!)
        corner.push(ni[0]!, ni[k]!, ni[k + 1]!)
      }
    }
    // vt, o, g, s, usemtl, mtllib, l, p: not needed for BP3D surfaces.
  }

  return {
    header: parseHeader(headerComments, opts.fileName),
    positions: Float64Array.from(positions),
    normals: normals.length > 0 ? Float64Array.from(normals) : null,
    triangles: Uint32Array.from(tris),
    cornerNormals: anyNormalRef ? Int32Array.from(corner) : null,
    stats: {
      vertexCount: positions.length / 3,
      normalCount: normals.length / 3,
      faceCount,
      triangleCount: tris.length / 3,
      polygonCount,
      skippedFaces,
      warnings,
    },
  }
}
