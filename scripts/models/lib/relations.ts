/**
 * Loader for the BodyParts3D relation text files (is-a / part-of "element parts" and "inclusion
 * relation" lists) that sit next to the OBJ archive.
 *
 * The exact column layout of the 4.0 files could not be inspected in this environment (the host is
 * blocked), so parsing is tolerant and self-describing:
 *  - files are recognised by name (`*element_parts*`, `*inclusion_relation*`, `*parts_list*`) and
 *    hierarchy (`isa*` / `partof*`);
 *  - rows are split on tabs (fallback: commas, then runs of 2+ spaces);
 *  - FMA concept ids (`FMA\d+`) and element file ids (`FJ\d+`) are recognised by pattern, names are
 *    the text cells next to them;
 *  - for inclusion lists the parent/child direction comes from the header when it names
 *    parent/child columns, otherwise it is inferred from which column the (leaf) element concepts
 *    appear in, otherwise it is assumed (parent first) and reported as such.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { naturalCompare, sha256 } from './util.ts'

export type Hierarchy = 'isa' | 'partof'
export type RelationFileKind = 'element_parts' | 'inclusion_relation' | 'parts_list' | 'other'
export type DirectionBasis = 'header' | 'inferred-from-elements' | 'assumed-parent-first'

export interface RelationFileInfo {
  name: string
  kind: RelationFileKind
  hierarchy: Hierarchy | null
  rows: number
  sha256: string
  /** Inclusion lists only: how the parent/child column order was determined. */
  direction?: DirectionBasis
}

export interface RelationData {
  files: RelationFileInfo[]
  /** FMA id digits -> English name. */
  conceptNames: Map<string, string>
  /** child FMA id -> parent FMA ids, per hierarchy. */
  parents: Record<Hierarchy, Map<string, string[]>>
  /** FJ element id -> FMA ids of concepts whose representation includes the element. */
  elementConcepts: Record<Hierarchy, Map<string, string[]>>
}

export interface Ancestor {
  fmaId: string
  name: string | null
  distance: number
  hierarchy: Hierarchy
}

const FMA_CELL = /^FMA[:_]?(\d+)$/i
const FJ_CELL = /^FJ\d+$/

export function classifyRelationFile(name: string): { kind: RelationFileKind; hierarchy: Hierarchy | null } {
  const lower = name.toLowerCase()
  const hierarchy: Hierarchy | null = /(^|[^a-z])part_?of/.test(lower) ? 'partof' : /(^|[^a-z])is_?a([^a-z]|$)/.test(lower) ? 'isa' : null
  const kind: RelationFileKind = /element_?parts/.test(lower)
    ? 'element_parts'
    : /inclusion_?relation/.test(lower)
      ? 'inclusion_relation'
      : /parts_?list/.test(lower)
        ? 'parts_list'
        : 'other'
  return { kind, hierarchy }
}

export function parseTable(text: string): { header: string[] | null; rows: string[][] } {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const lines = withoutBom
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
  if (lines.length === 0) return { header: null, rows: [] }
  const sample = lines.slice(0, 20).join('\n')
  const splitter = sample.includes('\t') ? /\t/ : sample.includes(',') ? /,/ : /\s{2,}/
  const table = lines.map((l) => l.split(splitter).map((c) => c.trim()))
  const first = table[0]!
  const hasIds = first.some((c) => FMA_CELL.test(c) || FJ_CELL.test(c))
  return hasIds ? { header: null, rows: table } : { header: first.map((h) => h.toLowerCase()), rows: table.slice(1) }
}

function fmaDigits(cell: string): string | null {
  const m = FMA_CELL.exec(cell)
  return m ? m[1]! : null
}

/** Name cell for an id cell: the next non-id, non-empty cell to its right. */
function nameAfter(row: string[], index: number): string | null {
  for (let k = index + 1; k < row.length; k++) {
    const c = row[k]!
    if (!c) continue
    if (FMA_CELL.test(c) || FJ_CELL.test(c)) return null
    if (/^[A-Za-z]/.test(c)) return c
  }
  return null
}

function pushUnique(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key)
  if (!list) map.set(key, [value])
  else if (!list.includes(value)) list.push(value)
}

export function emptyRelationData(): RelationData {
  return {
    files: [],
    conceptNames: new Map(),
    parents: { isa: new Map(), partof: new Map() },
    elementConcepts: { isa: new Map(), partof: new Map() },
  }
}

/**
 * Loads all relation text files in `dir` (non-recursive). `elementFmaIds` are the FMA ids found in
 * the OBJ headers; they are used to infer the column direction of inclusion lists.
 */
export function loadRelationFiles(dir: string, elementFmaIds: ReadonlySet<string>): RelationData {
  const data = emptyRelationData()
  let names: string[]
  try {
    names = readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.txt') && statSync(join(dir, n)).isFile())
  } catch {
    return data
  }
  names.sort(naturalCompare)
  for (const name of names) {
    const buf = readFileSync(join(dir, name))
    const { kind, hierarchy } = classifyRelationFile(name)
    const info: RelationFileInfo = { name, kind, hierarchy, rows: 0, sha256: sha256(buf) }
    data.files.push(info)
    if (kind === 'other') continue
    const { header, rows } = parseTable(buf.toString('utf8'))
    info.rows = rows.length
    if (kind === 'parts_list' || kind === 'element_parts') {
      for (const row of rows) {
        const fmaIdx = row.findIndex((c) => FMA_CELL.test(c))
        if (fmaIdx < 0) continue
        const fma = fmaDigits(row[fmaIdx]!)!
        const nm = nameAfter(row, fmaIdx)
        if (nm && !data.conceptNames.has(fma)) data.conceptNames.set(fma, nm)
        if (kind === 'element_parts' && hierarchy) {
          for (const c of row) if (FJ_CELL.test(c)) pushUnique(data.elementConcepts[hierarchy], c, fma)
        }
      }
      continue
    }
    // inclusion_relation
    if (!hierarchy) continue
    const pairs: { a: string; b: string }[] = []
    for (const row of rows) {
      const idIdx: number[] = []
      row.forEach((c, i) => {
        if (FMA_CELL.test(c)) idIdx.push(i)
      })
      if (idIdx.length < 2) continue
      const a = fmaDigits(row[idIdx[0]!]!)!
      const b = fmaDigits(row[idIdx[1]!]!)!
      const na = nameAfter(row, idIdx[0]!)
      const nb = nameAfter(row, idIdx[1]!)
      if (na && !data.conceptNames.has(a)) data.conceptNames.set(a, na)
      if (nb && !data.conceptNames.has(b)) data.conceptNames.set(b, nb)
      pairs.push({ a, b })
    }
    let parentFirst = true
    let direction: DirectionBasis = 'assumed-parent-first'
    const pIdx = header?.findIndex((h) => /parent|upper|super|whole/.test(h)) ?? -1
    const cIdx = header?.findIndex((h) => /child|lower|sub(?!ject)|part(?!s? ?list)/.test(h) && !/parent/.test(h)) ?? -1
    if (pIdx >= 0 && cIdx >= 0 && pIdx !== cIdx) {
      parentFirst = pIdx < cIdx
      direction = 'header'
    } else {
      let firstHits = 0
      let secondHits = 0
      for (const p of pairs) {
        if (elementFmaIds.has(p.a)) firstHits++
        if (elementFmaIds.has(p.b)) secondHits++
      }
      if (firstHits !== secondHits) {
        // Element concepts are the most specific ones, so they show up mostly as children.
        parentFirst = secondHits > firstHits
        direction = 'inferred-from-elements'
      }
    }
    info.direction = direction
    for (const p of pairs) {
      const [parent, child] = parentFirst ? [p.a, p.b] : [p.b, p.a]
      if (parent === child) continue
      pushUnique(data.parents[hierarchy], child, parent)
    }
  }
  for (const h of ['isa', 'partof'] as const) {
    for (const list of data.parents[h].values()) list.sort(naturalCompare)
    for (const list of data.elementConcepts[h].values()) list.sort(naturalCompare)
  }
  return data
}

/**
 * Ancestors of a concept, nearest first (breadth-first, cycle-safe). Concepts that include the
 * element according to the element-parts list but are not reachable through the inclusion list are
 * appended afterwards with distance = Infinity.
 */
export function ancestorsOf(data: RelationData, hierarchy: Hierarchy, fmaId: string | null, elementId: string | null): Ancestor[] {
  const out: Ancestor[] = []
  const seen = new Set<string>()
  if (fmaId) {
    seen.add(fmaId)
    let frontier = [fmaId]
    let distance = 0
    while (frontier.length > 0) {
      distance++
      const next: string[] = []
      for (const id of frontier) {
        for (const p of data.parents[hierarchy].get(id) ?? []) {
          if (seen.has(p)) continue
          seen.add(p)
          out.push({ fmaId: p, name: data.conceptNames.get(p) ?? null, distance, hierarchy })
          next.push(p)
        }
      }
      next.sort(naturalCompare)
      frontier = next
    }
  }
  if (elementId) {
    for (const c of data.elementConcepts[hierarchy].get(elementId) ?? []) {
      if (seen.has(c)) continue
      seen.add(c)
      out.push({ fmaId: c, name: data.conceptNames.get(c) ?? null, distance: Number.POSITIVE_INFINITY, hierarchy })
    }
  }
  return out
}
