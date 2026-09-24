/**
 * Core domain schema (single source of truth for all record types).
 *
 * Content files under /content are validated against these schemas at build time
 * (scripts/content/build-content.ts) and the compiled bundle in /public/data is
 * validated again when loaded in the browser.
 *
 * Design rules encoded here:
 *  - Optional content fields distinguish "not applicable", "not yet added" and
 *    "present but not verified" (see `fieldState`).
 *  - Every present content value must cite at least one source.
 *  - Text, labels, geometry and relations are reviewed separately; "approved"
 *    requires a review record by a named anatomy expert (enforced in validation).
 */
import { z } from 'zod'

export const SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Structure ids are namespaced and permanent: `fma:23981`, `uberon:0002107`, `ax:0001`. */
export const structureId = z
  .string()
  .regex(/^(fma|uberon|ax):[A-Za-z0-9_.-]+$/, 'structure id must be fma:/uberon:/ax: namespaced')
export type StructureId = z.infer<typeof structureId>

export const sourceId = z.string().regex(/^src:[a-z0-9._-]+$/)
export const assetId = z.string().regex(/^asset:[a-z0-9._-]+$/)
export const lessonId = z.string().regex(/^lesson:[a-z0-9._-]+$/)
export const questionId = z.string().regex(/^q:[a-z0-9._-]+$/)
export const relationId = z.string().regex(/^rel:[A-Za-z0-9._:-]+$/)
export const reviewId = z.string().regex(/^rev:[a-z0-9._-]+$/)
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/)

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const SYSTEM_IDS = [
  'skeletal',
  'articular',
  'muscular',
  'cardiovascular',
  'lymphatic',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'reproductive',
  'endocrine',
  'sensory',
  'integumentary',
] as const
export const systemIdSchema = z.enum(SYSTEM_IDS)
export type SystemId = z.infer<typeof systemIdSchema>

/** Top-level regions; sub-regions are declared in content/taxonomy/regions.json with a parent. */
export const TOP_REGION_IDS = [
  'head',
  'neck',
  'back',
  'thorax',
  'abdomen',
  'pelvis_perineum',
  'upper_limb',
  'lower_limb',
] as const
export const regionIdSchema = z.string().regex(/^[a-z][a-z0-9_]*$/)
export type RegionId = z.infer<typeof regionIdSchema>

export const DETAIL_LEVELS = ['basic', 'intermediate', 'advanced'] as const
export const detailLevelSchema = z.enum(DETAIL_LEVELS)
export type DetailLevel = z.infer<typeof detailLevelSchema>

/** Content modules with explicitly separate scope (core = normal adult anatomy). */
export const CONTENT_MODULES = ['core', 'pediatric', 'embryology', 'histology', 'pathology'] as const
export const contentModuleSchema = z.enum(CONTENT_MODULES)

export const STRUCTURE_KINDS = [
  'body_region',
  'bone',
  'bone_part',
  'bone_landmark',
  'foramen_or_canal',
  'joint',
  'ligament',
  'cartilage',
  'articular_disc_or_meniscus',
  'bursa_or_sheath',
  'muscle',
  'muscle_group',
  'tendon',
  'aponeurosis',
  'fascia',
  'compartment',
  'heart_part',
  'artery',
  'vein',
  'vascular_group',
  'lymphatic_vessel',
  'lymph_node_group',
  'lymphoid_organ',
  'brain_part',
  'spinal_cord_part',
  'meninges',
  'ventricular_system',
  'nerve',
  'nerve_plexus',
  'ganglion',
  'autonomic_structure',
  'organ',
  'organ_part',
  'gland',
  'duct',
  'tooth',
  'cavity_or_space',
  'serous_membrane',
  'peritoneal_structure',
  'sense_organ_part',
  'skin_layer',
  'skin_appendage',
  'surface_landmark',
  'other',
] as const
export const structureKindSchema = z.enum(STRUCTURE_KINDS)
export type StructureKind = z.infer<typeof structureKindSchema>

/**
 * Laterality of a record.
 *  - right/left: a sided instance (e.g. right humerus)
 *  - midline: unpaired structure on the median plane (e.g. sternum)
 *  - paired_generic: the side-independent concept of a paired structure (e.g. "humerus")
 *  - unpaired: unpaired but not on the midline (e.g. liver, spleen)
 *  - not_applicable
 */
export const LATERALITIES = ['right', 'left', 'midline', 'paired_generic', 'unpaired', 'not_applicable'] as const
export const lateralitySchema = z.enum(LATERALITIES)
export type Laterality = z.infer<typeof lateralitySchema>

export const sexSchema = z.enum(['both', 'female', 'male'])
export type Sex = z.infer<typeof sexSchema>

// ---------------------------------------------------------------------------
// Sources and licenses
// ---------------------------------------------------------------------------

export const licenseSchema = z.object({
  /** SPDX-like id, e.g. CC-BY-4.0, CC0-1.0, public-domain, all-rights-reserved-cite-only */
  id: z.string().min(1),
  url: z.string().url().optional(),
  attribution: z.string().optional(),
  allowsUse: z.boolean(),
  allowsModification: z.boolean(),
  allowsRedistribution: z.boolean(),
  shareAlike: z.boolean().default(false),
  nonCommercial: z.boolean().default(false),
  /** Where the license statement was read (primary page) and when. */
  verifiedAt: z.object({ url: z.string().url(), date: isoDate, quote: z.string().optional() }).optional(),
  notes: z.string().optional(),
})
export type License = z.infer<typeof licenseSchema>

export const SOURCE_TYPES = [
  'terminology',
  'ontology',
  'textbook',
  'open_textbook',
  'journal_article',
  'dataset',
  'model_library',
  'website',
  'standard',
] as const

export const sourceSchema = z.object({
  id: sourceId,
  type: z.enum(SOURCE_TYPES),
  /** Full citation as it should appear in the bibliography. */
  citation: z.string().min(1),
  shortLabel: z.string().min(1),
  url: z.string().url().optional(),
  doi: z.string().optional(),
  isbn: z.string().optional(),
  edition: z.string().optional(),
  version: z.string().optional(),
  year: z.number().int().optional(),
  accessed: isoDate.optional(),
  license: licenseSchema,
  /** What this source is used for in the app (names, text, relations, geometry, imaging, ...). */
  usedFor: z.array(z.string()).default([]),
  notes: z.string().optional(),
})
export type Source = z.infer<typeof sourceSchema>

export const sourceRefSchema = z.object({
  sourceId,
  /** Chapter/section/page/table or URL fragment within the source. */
  locator: z.string().optional(),
  note: z.string().optional(),
})
export type SourceRef = z.infer<typeof sourceRefSchema>

// ---------------------------------------------------------------------------
// Review workflow (separate for text, labels, geometry, relations)
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = [
  'draft',
  'source_check_pending',
  'expert_review_pending',
  'needs_revision',
  'approved',
] as const
export const reviewStatusSchema = z.enum(REVIEW_STATUSES)
export type ReviewStatus = z.infer<typeof reviewStatusSchema>

export const REVIEW_ASPECTS = ['text', 'labels', 'geometry', 'relations', 'question', 'lesson'] as const
export const reviewAspectSchema = z.enum(REVIEW_ASPECTS)
export type ReviewAspect = z.infer<typeof reviewAspectSchema>

export const reviewerSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['anatomy_expert', 'source_checker', 'editor']),
  affiliation: z.string().optional(),
  orcid: z.string().optional(),
})

/**
 * One human review event. The build refuses `approved` without a named anatomy expert,
 * and refuses any reviewer-less status other than draft/source_check_pending.
 * Automated checks (tests, AI claim-checking) are NOT review records; see `automatedCheckSchema`.
 */
export const reviewRecordSchema = z.object({
  id: reviewId,
  target: z.object({
    type: z.enum(['structure', 'relation', 'asset', 'question', 'lesson']),
    id: z.string().min(1),
  }),
  aspect: reviewAspectSchema,
  status: reviewStatusSchema,
  reviewer: reviewerSchema.optional(),
  date: isoDate,
  contentVersion: z.string().optional(),
  notes: z.string().optional(),
})
export type ReviewRecord = z.infer<typeof reviewRecordSchema>

export const automatedCheckSchema = z.object({
  check: z.string().min(1),
  tool: z.string().min(1),
  date: isoDate,
  result: z.enum(['pass', 'fail', 'partial']),
  details: z.string().optional(),
})
export type AutomatedCheck = z.infer<typeof automatedCheckSchema>

export const reviewStateSchema = z.object({
  text: reviewStatusSchema.default('draft'),
  labels: reviewStatusSchema.default('draft'),
  geometry: reviewStatusSchema.default('draft'),
  relations: reviewStatusSchema.default('draft'),
})
export type ReviewState = z.infer<typeof reviewStateSchema>

// ---------------------------------------------------------------------------
// Field state: distinguishes not applicable / not yet added / present (+ verification)
// ---------------------------------------------------------------------------

export const FIELD_VERIFICATION = ['unverified', 'source_checked', 'expert_approved'] as const
export const fieldVerificationSchema = z.enum(FIELD_VERIFICATION)

export function fieldState<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('status', [
    z.object({ status: z.literal('not_applicable'), note: z.string().optional() }),
    z.object({ status: z.literal('missing') }),
    z.object({
      status: z.literal('present'),
      value,
      verification: fieldVerificationSchema,
      sources: z.array(sourceRefSchema).min(1, 'present content must cite at least one source'),
      /** Present content that contains variant-dependent statements. */
      variantNote: z.string().optional(),
    }),
  ])
}

const textField = fieldState(z.string().min(1))
const textListField = fieldState(z.array(z.string().min(1)).min(1))

export const STRUCTURE_CONTENT_FIELDS = [
  'summary',
  'description',
  'location',
  'parts',
  'relationsText',
  'function',
  'origin',
  'insertion',
  'action',
  'jointType',
  'movements',
  'clinicalNotes',
  'variations',
] as const
export type StructureContentField = (typeof STRUCTURE_CONTENT_FIELDS)[number]

export const structureContentSchema = z.object({
  /** Kısa açıklama (1–2 cümle). */
  summary: textField.optional(),
  /** Ayrıntılı açıklama. */
  description: textField.optional(),
  /** Konum. */
  location: textField.optional(),
  /** Bölümler (prose; formal part-of links live in relations). */
  parts: textField.optional(),
  /** Komşuluklar ve bağlantılar (prose; formal links live in relations). */
  relationsText: textField.optional(),
  function: textField.optional(),
  /** Muscles: origin / insertion / action. */
  origin: textField.optional(),
  insertion: textField.optional(),
  action: textField.optional(),
  /** Joints/ligaments. */
  jointType: textField.optional(),
  movements: textField.optional(),
  /** Educational clinical anatomy notes (never personal diagnosis/treatment advice). */
  clinicalNotes: textListField.optional(),
  /** Known anatomical variations (text); variant structures themselves set `variation.isVariant`. */
  variations: textListField.optional(),
})
export type StructureContent = z.infer<typeof structureContentSchema>

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export const LANGS = ['tr', 'la', 'en'] as const
export const langSchema = z.enum(LANGS)
export type Lang = z.infer<typeof langSchema>

export const nameEntrySchema = z.object({
  value: z.string().min(1),
  /** verified = checked against the authoritative terminology source cited. */
  status: z.enum(['verified', 'unverified']),
  sources: z.array(sourceRefSchema).default([]),
})
export type NameEntry = z.infer<typeof nameEntrySchema>

export const synonymSchema = z.object({
  value: z.string().min(1),
  lang: langSchema,
  kind: z.enum(['synonym', 'eponym', 'former_term', 'common', 'abbreviation']),
  sources: z.array(sourceRefSchema).default([]),
})

// ---------------------------------------------------------------------------
// Anatomical structure
// ---------------------------------------------------------------------------

export const externalIdsSchema = z.object({
  fma: z.string().optional(),
  ta98: z.string().optional(),
  ta2: z.string().optional(),
  uberon: z.string().optional(),
  wikidata: z.string().optional(),
  bp3dRepresentation: z.string().optional(),
})

export const structureSchema = z.object({
  id: structureId,
  schemaVersion: z.literal(SCHEMA_VERSION),
  kind: structureKindSchema,
  names: z.object({
    en: nameEntrySchema,
    la: nameEntrySchema.optional(),
    tr: nameEntrySchema.optional(),
  }),
  synonyms: z.array(synonymSchema).default([]),
  externalIds: externalIdsSchema.default({}),
  systems: z.array(systemIdSchema).min(1),
  regions: z.array(regionIdSchema).default([]),
  /** How region membership was determined. */
  regionBasis: z.enum(['authored', 'derived_from_hierarchy', 'derived_from_geometry', 'unassigned']).default('unassigned'),
  laterality: lateralitySchema,
  /** Opposite-side instance (right <-> left). */
  counterpartId: structureId.optional(),
  /** Side-independent concept for a sided instance. */
  genericId: structureId.optional(),
  /** Part-of parents (may be several; non-tree relations live in relations). */
  parentIds: z.array(structureId).default([]),
  sex: sexSchema.default('both'),
  detailLevel: detailLevelSchema,
  module: contentModuleSchema.default('core'),
  variation: z
    .object({ isVariant: z.boolean(), note: z.string().optional(), sources: z.array(sourceRefSchema).default([]) })
    .default({ isVariant: false, sources: [] }),
  /** Dissection depth index within its region (0 = superficial). Used by layer peeling. */
  depthLayer: z.number().int().min(0).max(20).optional(),
  content: structureContentSchema.default({}),
  review: reviewStateSchema.default({ text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' }),
  lastReviewedAt: isoDate.optional(),
  automatedChecks: z.array(automatedCheckSchema).default([]),
  provenance: z.object({
    createdBy: z.enum(['import:bodyparts3d', 'import:hra', 'import:wikidata', 'author:ai-draft', 'author:human']),
    createdAt: isoDate,
    updatedAt: isoDate,
    notes: z.string().optional(),
  }),
})
export type Structure = z.infer<typeof structureSchema>
export type StructureInput = z.input<typeof structureSchema>

// ---------------------------------------------------------------------------
// Relations between structures (graph, not a tree)
// ---------------------------------------------------------------------------

export const RELATION_TYPES = [
  'part_of',
  'branch_of',
  'tributary_of',
  'continuous_with',
  'arterial_supply',
  'venous_drainage',
  'lymphatic_drainage',
  'innervated_by',
  'origin_on',
  'insertion_on',
  'articulates_with',
  'adjacent_to',
  'passes_through',
  'contains',
  'bounded_by',
  'member_of_group',
  'located_in_compartment',
  'acts_on_joint',
  'attaches_to',
] as const
export const relationTypeSchema = z.enum(RELATION_TYPES)
export type RelationType = z.infer<typeof relationTypeSchema>

export const relationSchema = z.object({
  id: relationId,
  type: relationTypeSchema,
  from: structureId,
  to: structureId,
  /** e.g. direction for adjacency: anterior/posterior/medial/lateral/superior/inferior/deep/superficial. */
  qualifier: z.string().optional(),
  note: z.string().optional(),
  isVariant: z.boolean().default(false),
  sources: z.array(sourceRefSchema).min(1),
  verification: fieldVerificationSchema,
  review: reviewStatusSchema.default('draft'),
  provenance: z.enum(['import:fma', 'import:bodyparts3d', 'author:ai-draft', 'author:human']),
})
export type Relation = z.infer<typeof relationSchema>

// ---------------------------------------------------------------------------
// 3D model assets
// ---------------------------------------------------------------------------

/**
 * Canonical app coordinate frame (identical to the glTF 2.0 convention):
 *   +X = subject's LEFT, +Y = SUPERIOR, +Z = ANTERIOR; right-handed; units = metres;
 *   body in anatomical position. Anterior view = camera on +Z looking toward -Z, so the
 *   subject's right appears on the viewer's left.
 */
export const COORDINATE_FRAME_ID = 'anat-gltf-v1'

export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])
export const vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export type Vec3 = z.infer<typeof vec3Schema>

export const assetNodeSchema = z.object({
  /** Mesh node name inside the GLB (unique within the asset). */
  node: z.string().min(1),
  /** Most specific structure this node represents. */
  structureId,
  /** Source element id, e.g. BodyParts3D FJ file id. */
  elementId: z.string().optional(),
  triangles: z.number().int().nonnegative(),
  bbox: bboxSchema,
  centroid: vec3Schema,
  /** Structure was protected from simplification because it is small but educationally important. */
  protectedFromSimplification: z.boolean().default(false),
})

export const provenanceStepSchema = z.object({
  date: isoDate,
  step: z.string().min(1),
  tool: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
})

export const assetSchema = z.object({
  id: assetId,
  file: z.string().min(1),
  format: z.literal('glb'),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().optional(),
  sourceId,
  coordinateFrame: z.literal(COORDINATE_FRAME_ID),
  /** anatomical = derived from real anatomical data; schematic = simplified placeholder geometry. */
  representation: z.enum(['anatomical', 'schematic']),
  /** base = part of the whole-body scene; detail = separately loaded high-detail model. */
  lod: z.enum(['base', 'detail']),
  /** Detail models may live in their own frame when they are not registered to the body. */
  registeredToBody: z.boolean().default(true),
  /** For lod=detail: the base asset whose nodes this asset replaces while loaded. */
  detailFor: assetId.optional(),
  /** Region/system chunk key, e.g. "skeletal/upper_limb" (used for on-demand loading). */
  chunk: z.string().min(1),
  systems: z.array(systemIdSchema).min(1),
  regions: z.array(regionIdSchema).default([]),
  label: z.object({ tr: z.string(), en: z.string() }),
  nodes: z.array(assetNodeSchema),
  provenance: z.array(provenanceStepSchema).min(1),
  review: z.object({ geometry: reviewStatusSchema.default('draft') }).default({ geometry: 'draft' }),
})
export type ModelAsset = z.infer<typeof assetSchema>
export type AssetNode = z.infer<typeof assetNodeSchema>

// ---------------------------------------------------------------------------
// Lessons, questions
// ---------------------------------------------------------------------------

export const CAMERA_PRESETS = ['anterior', 'posterior', 'right', 'left', 'superior', 'inferior'] as const
export const cameraPresetSchema = z.enum(CAMERA_PRESETS)
export type CameraPreset = z.infer<typeof cameraPresetSchema>

export const lessonSchema = z.object({
  id: lessonId,
  title: z.string().min(1),
  level: detailLevelSchema,
  systems: z.array(systemIdSchema).default([]),
  regions: z.array(regionIdSchema).default([]),
  objectives: z.array(z.object({ id: z.string(), text: z.string().min(1) })).min(1),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        body: z.string().min(1),
        focus: z.array(structureId).default([]),
        show: z.array(structureId).default([]),
        isolate: z.boolean().default(false),
        camera: cameraPresetSchema.optional(),
        sources: z.array(sourceRefSchema).min(1),
      }),
    )
    .min(1),
  review: reviewStatusSchema.default('draft'),
  provenance: z.enum(['author:ai-draft', 'author:human']),
})
export type Lesson = z.infer<typeof lessonSchema>

export const QUESTION_TYPES = ['find', 'name', 'relation', 'section', 'mcq'] as const
export const questionTypeSchema = z.enum(QUESTION_TYPES)
export type QuestionType = z.infer<typeof questionTypeSchema>

/** Authored question. Generated questions are produced at runtime from records (src/learning). */
export const questionSchema = z.object({
  id: questionId,
  type: questionTypeSchema,
  level: detailLevelSchema,
  systems: z.array(systemIdSchema).default([]),
  regions: z.array(regionIdSchema).default([]),
  prompt: z.string().min(1),
  target: structureId.optional(),
  options: z.array(z.object({ id: z.string(), text: z.string().min(1), structureId: structureId.optional() })).optional(),
  answer: z.object({ optionId: z.string().optional(), structureId: structureId.optional(), text: z.string().optional() }),
  explanation: z.string().min(1),
  /** Structures that must be visible and selectable for the question to be answerable. */
  requiresVisible: z.array(structureId).default([]),
  sources: z.array(sourceRefSchema).min(1),
  review: reviewStatusSchema.default('draft'),
  provenance: z.enum(['author:ai-draft', 'author:human']),
})
export type Question = z.infer<typeof questionSchema>

// ---------------------------------------------------------------------------
// Scope matrix (the measurable definition of "complete")
// ---------------------------------------------------------------------------

export const scopeTargetSchema = z.object({
  /** Target id; equals the structure id once the structure exists. */
  id: z.string().min(1),
  structureId: structureId.optional(),
  system: systemIdSchema,
  region: regionIdSchema,
  kind: structureKindSchema,
  level: detailLevelSchema,
  name: z.object({ en: z.string().min(1), la: z.string().optional(), tr: z.string().optional() }),
  laterality: lateralitySchema,
  sex: sexSchema.default('both'),
  module: contentModuleSchema.default('core'),
  /** Why the target is in scope (source of the target list). */
  basis: z.array(sourceRefSchema).min(1),
  notes: z.string().optional(),
})
export type ScopeTarget = z.infer<typeof scopeTargetSchema>

// ---------------------------------------------------------------------------
// Taxonomy records (systems/regions with trilingual names)
// ---------------------------------------------------------------------------

export const taxonNameSchema = z.object({ tr: z.string().min(1), la: z.string().optional(), en: z.string().min(1) })

export const systemRecordSchema = z.object({
  id: systemIdSchema,
  name: taxonNameSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Default dissection order (0 = most superficial) for system-level layer peeling. */
  layerOrder: z.number().int(),
  description: z.string().optional(),
})
export type SystemRecord = z.infer<typeof systemRecordSchema>

export const regionRecordSchema = z.object({
  id: regionIdSchema,
  parentId: regionIdSchema.optional(),
  name: taxonNameSchema,
  order: z.number().int(),
})
export type RegionRecord = z.infer<typeof regionRecordSchema>

// ---------------------------------------------------------------------------
// Compiled content bundle (public/data/*.json)
// ---------------------------------------------------------------------------

export const contentManifestSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  contentVersion: z.string().min(1),
  generatedAt: isoDate,
  counts: z.record(z.string(), z.number().int()),
  files: z.record(z.string(), z.string()),
})
export type ContentManifest = z.infer<typeof contentManifestSchema>

// ---------------------------------------------------------------------------
// User data (stored locally in IndexedDB; exportable/deletable)
// ---------------------------------------------------------------------------

export const cameraStateSchema = z.object({
  position: vec3Schema,
  target: vec3Schema,
  up: vec3Schema.default([0, 1, 0]),
  fov: z.number().positive().optional(),
})
export type CameraState = z.infer<typeof cameraStateSchema>

export const clipStateSchema = z.object({
  enabled: z.boolean(),
  plane: z.enum(['sagittal', 'coronal', 'axial']),
  /** Offset along the plane normal, metres, in the canonical frame. */
  offset: z.number(),
  /** Which half is kept: 'positive' keeps +normal side. */
  keep: z.enum(['positive', 'negative']),
  showCap: z.boolean().default(true),
})
export type ClipState = z.infer<typeof clipStateSchema>

export const VISIBILITY_MODES = ['visible', 'hidden', 'ghost'] as const
export const visibilityModeSchema = z.enum(VISIBILITY_MODES)
export type VisibilityMode = z.infer<typeof visibilityModeSchema>

/** Serializable scene/view state — also the payload of saved views and error reports. */
export const sceneStateSchema = z.object({
  /** Loaded asset ids (systems/regions in the scene). */
  loadedAssets: z.array(assetId).default([]),
  /** Per-structure override of visibility; default = visible when its asset is loaded. */
  visibility: z.record(z.string(), visibilityModeSchema).default({}),
  /** Per-system visibility/opacity (0..1). */
  systemVisibility: z.record(z.string(), z.boolean()).default({}),
  systemOpacity: z.record(z.string(), z.number().min(0).max(1)).default({}),
  /** Isolation set; empty = no isolation. */
  isolated: z.array(structureId).default([]),
  /** Structures removed by virtual dissection, in removal order. */
  dissected: z.array(structureId).default([]),
  selected: z.array(structureId).default([]),
  labels: z.object({ enabled: z.boolean(), density: z.enum(['low', 'medium', 'high']) }).default({ enabled: true, density: 'medium' }),
  clip: clipStateSchema.default({ enabled: false, plane: 'sagittal', offset: 0, keep: 'positive', showCap: true }),
  /** Exploded view factor 0..1 (0 = true anatomical positions). */
  explode: z.number().min(0).max(1).default(0),
  camera: cameraStateSchema.optional(),
})
export type SceneState = z.infer<typeof sceneStateSchema>

export const savedViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDate,
  contentVersion: z.string().optional(),
  scene: sceneStateSchema,
})
export type SavedView = z.infer<typeof savedViewSchema>

export const noteSchema = z.object({
  id: z.string().min(1),
  structureId: structureId.optional(),
  text: z.string().min(1).max(20000),
  createdAt: isoDate,
  updatedAt: isoDate,
})
export type Note = z.infer<typeof noteSchema>

export const favoriteSchema = z.object({ structureId, createdAt: isoDate })
export type Favorite = z.infer<typeof favoriteSchema>

export const srsStateSchema = z.object({
  /** SM-2 easiness factor (>= 1.3). */
  ease: z.number().min(1.3),
  intervalDays: z.number().nonnegative(),
  repetitions: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  dueAt: isoDate,
})
export type SrsState = z.infer<typeof srsStateSchema>

/** Progress per structure — "viewed" and "answered correctly" are tracked separately. */
export const progressSchema = z.object({
  structureId,
  viewCount: z.number().int().nonnegative(),
  firstViewedAt: isoDate.optional(),
  lastViewedAt: isoDate.optional(),
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  lastAnsweredAt: isoDate.optional(),
  lastResult: z.enum(['correct', 'incorrect']).optional(),
  srs: srsStateSchema.optional(),
})
export type Progress = z.infer<typeof progressSchema>

export const quizAttemptSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['find', 'name', 'relation', 'section', 'review', 'exam']),
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
  items: z.array(
    z.object({
      questionId: z.string(),
      structureId: structureId.optional(),
      correct: z.boolean(),
      answeredAt: isoDate,
      responseMs: z.number().int().nonnegative().optional(),
    }),
  ),
})
export type QuizAttempt = z.infer<typeof quizAttemptSchema>

export const errorReportSchema = z.object({
  id: z.string().min(1),
  structureId: structureId.optional(),
  category: z.enum(['label', 'name', 'relation', 'geometry', 'position', 'text', 'question', 'other']),
  description: z.string().min(1).max(5000),
  createdAt: isoDate,
  appVersion: z.string(),
  contentVersion: z.string().optional(),
  view: sceneStateSchema,
  status: z.enum(['local', 'exported']).default('local'),
})
export type ErrorReport = z.infer<typeof errorReportSchema>

export const userExportSchema = z.object({
  format: z.literal('anatomi-3b-user-export'),
  version: z.literal(1),
  exportedAt: isoDate,
  notes: z.array(noteSchema),
  favorites: z.array(favoriteSchema),
  progress: z.array(progressSchema),
  savedViews: z.array(savedViewSchema),
  quizAttempts: z.array(quizAttemptSchema),
  errorReports: z.array(errorReportSchema),
  settings: z.record(z.string(), z.unknown()).default({}),
})
export type UserExport = z.infer<typeof userExportSchema>
