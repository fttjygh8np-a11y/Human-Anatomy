/**
 * SCHEMATIC test model for development, unit and end-to-end tests of the 3D engine.
 *
 * NOT ANATOMY. The geometry is a handful of primitive boxes and one cylinder placed at
 * arbitrary positions. It exists only to exercise loading, node lookup, picking, visibility,
 * clipping, explode and left/right orientation in the `anat-gltf-v1` frame
 * (+X = subject's left, +Y = superior, +Z = anterior, metres). It must never be counted as
 * anatomical content; the asset record is marked `representation: 'schematic'`.
 *
 * Pure module (no Node/DOM APIs): used by scripts/fixtures/make-schematic-glb.ts and tests.
 */
import { Document } from '@gltf-transform/core'
import type { AssetNode, ModelAsset } from '../../core/schema.ts'

export const SCHEMATIC_ASSET_ID = 'asset:dev.schematic'
export const SCHEMATIC_FILE = 'models/dev/schematic-test.glb'
export const SCHEMATIC_SOURCE_ID = 'src:dev.schematic-fixture'
/** Fixed so that regenerated files are byte-identical. */
export const SCHEMATIC_DATE = '2026-09-24'

type V3 = [number, number, number]

interface ShapeSpec {
  node: string
  structureId: string
  kind: 'box' | 'cylinder'
  /** World-space centre (app frame). */
  center: V3
  /** Box: full extents; cylinder: [diameter, height, diameter] (axis = +Y). */
  size: V3
  /** Node translation relative to the root (exercises node transforms in the loader). */
  nodeTranslation?: V3
}

/** Root node translation (exercises parent transforms). */
export const SCHEMATIC_ROOT_TRANSLATION: V3 = [0, 0.05, 0]

/**
 * Shapes. Names only describe the side of the frame axis (±X, +Y, +Z) so tests can check,
 * e.g., that the +X object is drawn on the viewer's RIGHT in the anterior view (the
 * subject's left). One node name contains a space and a dot on purpose: GLTFLoader
 * sanitises such names, so it exercises lookup by the original glTF node name.
 */
export const SCHEMATIC_SHAPES: readonly ShapeSpec[] = [
  { node: 'dev_box_plus_x', structureId: 'ax:dev.schematic.box_plus_x', kind: 'box', center: [0.15, 1.0, 0], size: [0.1, 0.3, 0.1] },
  { node: 'dev_box_minus_x', structureId: 'ax:dev.schematic.box_minus_x', kind: 'box', center: [-0.15, 1.0, 0], size: [0.1, 0.3, 0.1] },
  {
    node: 'dev_cylinder_mid',
    structureId: 'ax:dev.schematic.cylinder_mid',
    kind: 'cylinder',
    center: [0, 1.0, 0],
    size: [0.1, 0.5, 0.1],
    nodeTranslation: [0, 0.95, 0],
  },
  { node: 'dev_box_plus_z', structureId: 'ax:dev.schematic.box_plus_z', kind: 'box', center: [0, 1.1, 0.12], size: [0.06, 0.06, 0.04] },
  { node: 'dev.box plus_y', structureId: 'ax:dev.schematic.box_plus_y', kind: 'box', center: [0, 1.35, 0], size: [0.2, 0.08, 0.1] },
]

interface MeshData {
  positions: number[]
  normals: number[]
  indices: number[]
}

function boxMesh(c: V3, s: V3): MeshData {
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2]
  const faces: Array<{ n: V3; u: V3; v: V3 }> = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  ]
  const out: MeshData = { positions: [], normals: [], indices: [] }
  for (const f of faces) {
    const base = out.positions.length / 3
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        const h = [hx, hy, hz][i]!
        out.positions.push(c[i]! + (f.n[i]! + f.u[i]! * a + f.v[i]! * b) * h)
      }
      out.normals.push(...f.n)
    }
    // Counter-clockwise when seen from outside (u × v = n).
    out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return out
}

function cylinderMesh(c: V3, radius: number, height: number, segments = 24): MeshData {
  const out: MeshData = { positions: [], normals: [], indices: [] }
  const h = height / 2
  // Side.
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const x = Math.sin(a)
    const z = Math.cos(a)
    out.positions.push(c[0] + x * radius, c[1] - h, c[2] + z * radius, c[0] + x * radius, c[1] + h, c[2] + z * radius)
    out.normals.push(x, 0, z, x, 0, z)
  }
  for (let i = 0; i < segments; i++) {
    const b = i * 2
    out.indices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
  }
  // Caps.
  for (const sign of [1, -1]) {
    const center = out.positions.length / 3
    out.positions.push(c[0], c[1] + sign * h, c[2])
    out.normals.push(0, sign, 0)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      out.positions.push(c[0] + Math.sin(a) * radius, c[1] + sign * h, c[2] + Math.cos(a) * radius)
      out.normals.push(0, sign, 0)
    }
    for (let i = 0; i < segments; i++) {
      const p = center + 1 + i
      if (sign > 0) out.indices.push(center, p, p + 1)
      else out.indices.push(center, p + 1, p)
    }
  }
  return out
}

const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

export interface SchematicBuild {
  document: Document
  /** Catalogue node records (bbox/centroid in world space, app frame). */
  nodes: AssetNode[]
}

export function buildSchematicDocument(): SchematicBuild {
  const doc = new Document()
  doc.getRoot().getAsset().generator = 'anatomi-3b schematic test fixture (NOT ANATOMY)'
  const buffer = doc.createBuffer('schematic')
  const material = doc.createMaterial('dev_schematic_material').setBaseColorFactor([0.7, 0.7, 0.7, 1]).setRoughnessFactor(0.8)
  const scene = doc.createScene('dev_schematic_scene')
  doc.getRoot().setDefaultScene(scene)
  const root = doc.createNode('dev_schematic_root').setTranslation(SCHEMATIC_ROOT_TRANSLATION)
  scene.addChild(root)

  const nodes: AssetNode[] = []
  for (const shape of SCHEMATIC_SHAPES) {
    const nodeT = shape.nodeTranslation ?? [0, 0, 0]
    const localCenter = sub3(sub3(shape.center, SCHEMATIC_ROOT_TRANSLATION), nodeT)
    const data =
      shape.kind === 'box' ? boxMesh(localCenter, shape.size) : cylinderMesh(localCenter, shape.size[0] / 2, shape.size[1])

    const position = doc.createAccessor(`${shape.node}_position`).setType('VEC3').setArray(new Float32Array(data.positions)).setBuffer(buffer)
    const normal = doc.createAccessor(`${shape.node}_normal`).setType('VEC3').setArray(new Float32Array(data.normals)).setBuffer(buffer)
    const indices = doc.createAccessor(`${shape.node}_indices`).setType('SCALAR').setArray(new Uint16Array(data.indices)).setBuffer(buffer)
    const prim = doc.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal).setIndices(indices).setMaterial(material)
    const mesh = doc.createMesh(`${shape.node}_mesh`).addPrimitive(prim)
    const node = doc.createNode(shape.node).setMesh(mesh).setTranslation(nodeT)
    root.addChild(node)

    // World-space bounds: local vertices + node translation + root translation.
    const min: V3 = [Infinity, Infinity, Infinity]
    const max: V3 = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < data.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const w = data.positions[i + k]! + nodeT[k]! + SCHEMATIC_ROOT_TRANSLATION[k]!
        min[k] = Math.min(min[k]!, w)
        max[k] = Math.max(max[k]!, w)
      }
    }
    const round = (x: number) => Math.round(x * 1e6) / 1e6
    nodes.push({
      node: shape.node,
      structureId: shape.structureId,
      triangles: data.indices.length / 3,
      bbox: [...min, ...max].map(round) as AssetNode['bbox'],
      centroid: [0, 1, 2].map((k) => round((min[k]! + max[k]!) / 2)) as AssetNode['centroid'],
      protectedFromSimplification: false,
    })
  }
  return { document: doc, nodes }
}

/** Catalogue record for the schematic fixture (validate with `assetSchema` before use). */
export function makeSchematicAsset(opts: { nodes: AssetNode[]; bytes: number; sha256?: string; file?: string }): ModelAsset {
  return {
    id: SCHEMATIC_ASSET_ID,
    file: opts.file ?? SCHEMATIC_FILE,
    format: 'glb',
    bytes: opts.bytes,
    ...(opts.sha256 ? { sha256: opts.sha256 } : {}),
    sourceId: SCHEMATIC_SOURCE_ID,
    coordinateFrame: 'anat-gltf-v1',
    representation: 'schematic',
    lod: 'base',
    registeredToBody: true,
    chunk: 'dev/schematic',
    systems: ['skeletal'],
    regions: [],
    label: {
      tr: 'Şematik test modeli (anatomik değildir; yalnızca geliştirme ve testler için)',
      en: 'Schematic test model (not anatomical; development and tests only)',
    },
    nodes: opts.nodes,
    provenance: [
      {
        date: SCHEMATIC_DATE,
        step: 'Basit geometrik şekillerden (kutu, silindir) şematik test modeli üretildi. Anatomik veri içermez.',
        tool: 'scripts/fixtures/make-schematic-glb.ts (@gltf-transform/core)',
      },
    ],
    review: { geometry: 'draft' },
  }
}
