/**
 * Writes the SCHEMATIC (non-anatomical) test model used for development and e2e tests:
 *
 *   public/models/dev/schematic-test.glb         primitive boxes + one cylinder, named nodes
 *   public/models/dev/schematic-test.asset.json  matching catalogue record (representation: 'schematic')
 *
 * This geometry is NOT anatomy and must never be counted as anatomical content.
 *
 * Usage: node scripts/fixtures/make-schematic-glb.ts
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { assetSchema } from '../../src/core/schema.ts'
import { SCHEMATIC_FILE, buildSchematicDocument, makeSchematicAsset } from '../../src/viewer/fixtures/schematicModel.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const glbPath = join(repoRoot, 'public', SCHEMATIC_FILE)
const jsonPath = glbPath.replace(/\.glb$/, '.asset.json')

const { document, nodes } = buildSchematicDocument()
const glb = await new NodeIO().writeBinary(document)
const sha256 = createHash('sha256').update(glb).digest('hex')
const asset = assetSchema.parse(makeSchematicAsset({ nodes, bytes: glb.byteLength, sha256 }))

await mkdir(dirname(glbPath), { recursive: true })
await writeFile(glbPath, glb)
await writeFile(jsonPath, JSON.stringify(asset, null, 2) + '\n', 'utf8')

console.log(`Şematik test modeli yazıldı (anatomik DEĞİLDİR): ${glbPath} (${glb.byteLength} bayt, ${nodes.length} düğüm)`)
console.log(`Varlık kaydı: ${jsonPath}`)
