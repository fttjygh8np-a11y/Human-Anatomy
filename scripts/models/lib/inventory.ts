/**
 * Element inventory (vendor/bodyparts3d/elements.json) — the hand-off from the model build to the
 * content pipeline (scripts/content/build-inventory.ts). One entry per BodyParts3D element file,
 * including the ones that were skipped, with classification evidence and automated checks.
 */
import { z } from 'zod'
import {
  COORDINATE_FRAME_ID,
  assetId,
  automatedCheckSchema,
  bboxSchema,
  isoDate,
  sourceId,
  structureId,
  systemIdSchema,
  TOP_REGION_IDS,
  vec3Schema,
} from '../../../src/core/schema.ts'

export const INVENTORY_VERSION = 1

const lodRefSchema = z.object({
  assetId,
  node: z.string().min(1),
  triangles: z.number().int().nonnegative(),
  /** Base LOD only: element kept at full resolution after the bbox-preservation check failed. */
  revertedToFullResolution: z.boolean().optional(),
})

export const inventoryElementSchema = z.object({
  elementId: z.string().min(1),
  fmaId: z.string().regex(/^\d+$/).nullable(),
  structureId: structureId.nullable(),
  /** English name as written in the OBJ header (not verified against FMA/TA2). */
  nameEn: z.string().nullable(),
  nameSource: z.enum(['header-key', 'header-line', 'relation-file']).nullable(),
  sourceFile: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
  headerLicense: z.string().nullable(),
  system: systemIdSchema.nullable(),
  classificationBasis: z.enum(['hierarchy', 'heuristic', 'unclassified']),
  systemEvidence: z.string().nullable(),
  region: z.enum(TOP_REGION_IDS).nullable(),
  regionBasis: z.enum(['hierarchy', 'heuristic', 'unassigned']),
  regionEvidence: z.string().nullable(),
  chunk: z.string().nullable(),
  /** Direct parents in the BodyParts3D relation files (when available). */
  partOfParents: z.array(structureId),
  isaParents: z.array(structureId),
  laterality: z.object({
    fromName: z.enum(['left', 'right']).nullable(),
    observed: z.enum(['left', 'right', 'midline']),
    offsetXM: z.number(),
  }),
  geometry: z
    .object({
      sourceVertices: z.number().int().nonnegative(),
      sourceTriangles: z.number().int().nonnegative(),
      weldedVertices: z.number().int().nonnegative(),
      triangles: z.number().int().nonnegative(),
      degenerateTrianglesRemoved: z.number().int().nonnegative(),
      windingFlipped: z.boolean(),
      bbox: bboxSchema,
      centroid: vec3Schema,
      areaM2: z.number().nonnegative(),
    })
    .nullable(),
  protectedFromSimplification: z.boolean(),
  protectedReason: z.string().nullable(),
  lods: z.object({ base: lodRefSchema.nullable(), detail: lodRefSchema.nullable() }),
  skipped: z.string().nullable(),
  parseWarnings: z.array(z.string()),
  checks: z.array(automatedCheckSchema),
})
export type InventoryElement = z.infer<typeof inventoryElementSchema>

export const inventorySchema = z.object({
  inventoryVersion: z.literal(INVENTORY_VERSION),
  generatedAt: isoDate,
  sourceId,
  sourceVersion: z.string(),
  coordinateFrame: z.literal(COORDINATE_FRAME_ID),
  sourceFrame: z.literal('bp3d-lps-mm'),
  midline: z.object({
    x: z.number(),
    method: z.enum(['override', 'left-right-pairs', 'overall-bbox-center', 'default-zero']),
    pairs: z.number().int().nonnegative(),
  }),
  relationFiles: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      hierarchy: z.enum(['isa', 'partof']).nullable(),
      rows: z.number().int().nonnegative(),
      sha256: z.string(),
      direction: z.string().optional(),
    }),
  ),
  elements: z.array(inventoryElementSchema),
})
export type Inventory = z.infer<typeof inventorySchema>
