/**
 * GLB writer: one mesh node per element (node name = element id), meshopt-compressed
 * (EXT_meshopt_compression) with KHR_mesh_quantization. Output is deterministic for identical input.
 */
import { Document, Logger, NodeIO } from '@gltf-transform/core'
import type { Node } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import type { IndexedMesh } from './mesh.ts'

export interface GlbNodeInput {
  /** Node (and mesh) name — the BodyParts3D element id. */
  name: string
  mesh: IndexedMesh
  extras: Record<string, unknown>
}

export interface GlbOptions {
  materialName: string
  color: [number, number, number]
  copyright: string
  generator: string
  sceneName: string
  sceneExtras: Record<string, unknown>
  quantizePosition: number
  quantizeNormal: number
  meshoptLevel: 'medium' | 'high'
}

export async function createIO(): Promise<NodeIO> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
  return new NodeIO()
    .setLogger(new Logger(Logger.Verbosity.WARN))
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
}

export async function writeGlb(nodes: GlbNodeInput[], opts: GlbOptions): Promise<Uint8Array> {
  const io = await createIO()
  const doc = new Document().setLogger(new Logger(Logger.Verbosity.WARN))
  doc.getRoot().getAsset().generator = opts.generator
  doc.getRoot().getAsset().copyright = opts.copyright
  const buffer = doc.createBuffer()
  const material = doc
    .createMaterial(opts.materialName)
    .setBaseColorFactor([opts.color[0], opts.color[1], opts.color[2], 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.8)
  const scene = doc.createScene(opts.sceneName).setExtras(opts.sceneExtras)
  doc.getRoot().setDefaultScene(scene)

  for (const n of nodes) {
    const vertexCount = n.mesh.positions.length / 3
    const indexArray = vertexCount <= 65535 ? Uint16Array.from(n.mesh.indices) : n.mesh.indices
    const position = doc.createAccessor(`${n.name}.POSITION`, buffer).setType('VEC3').setArray(n.mesh.positions)
    const normal = doc.createAccessor(`${n.name}.NORMAL`, buffer).setType('VEC3').setArray(n.mesh.normals)
    const indices = doc.createAccessor(`${n.name}.indices`, buffer).setType('SCALAR').setArray(indexArray)
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', position)
      .setAttribute('NORMAL', normal)
      .setIndices(indices)
      .setMaterial(material)
    const mesh = doc.createMesh(n.name).addPrimitive(prim)
    const node: Node = doc.createNode(n.name).setMesh(mesh).setExtras(n.extras)
    scene.addChild(node)
  }

  await doc.transform(
    meshopt({
      encoder: MeshoptEncoder,
      level: opts.meshoptLevel,
      quantizePosition: opts.quantizePosition,
      quantizeNormal: opts.quantizeNormal,
      quantizationVolume: 'mesh',
    }),
  )
  return io.writeBinary(doc)
}
