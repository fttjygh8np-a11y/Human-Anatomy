/**
 * Synthetic content bundle for learning-engine tests.
 *
 * Every record here is a placeholder: names read "Sentetik yapı NN" / "Structura synthetica NN" /
 * "Synthetic structure NN", sources are explicitly marked as not being real references, and no
 * record states an anatomical fact. Review statuses are test inputs, not claims of real review.
 */
import {
  assetSchema,
  lessonSchema,
  questionSchema,
  relationSchema,
  sourceSchema,
  structureSchema,
  type ModelAsset,
  type Relation,
  type StructureInput,
} from '../../core/schema.ts'
import { createContentIndex } from '../../data/contentIndex.ts'
import type { ContentBundle, ContentIndex } from '../../data/types.ts'

const DATE = '2026-09-24'

export const SRC_TERMS = 'src:synthetic-terms'
export const SRC_MODELS = 'src:synthetic-models'
export const SRC_RELATIONS = 'src:synthetic-relations'
export const SRC_QUESTIONS = 'src:synthetic-questions'

const license = {
  id: 'test-only',
  allowsUse: true,
  allowsModification: true,
  allowsRedistribution: true,
}

const sources = [SRC_TERMS, SRC_MODELS, SRC_RELATIONS, SRC_QUESTIONS].map((id) =>
  sourceSchema.parse({
    id,
    type: 'dataset',
    citation: `Sentetik test kaynağı (${id}) — gerçek bir kaynak değildir; yalnızca birim testleri içindir.`,
    shortLabel: id,
    license,
  }),
)

const ref = (sourceId: string, locator?: string) => [{ sourceId, ...(locator ? { locator } : {}) }]

/** Synthetic names for number `n`, all citing the synthetic terminology source. */
function names(n: string, opts: { sources?: { sourceId: string }[]; verified?: boolean } = {}) {
  const status: 'verified' | 'unverified' = opts.verified ? 'verified' : 'unverified'
  const s = opts.sources ?? ref(SRC_TERMS, `giriş ${n}`)
  return {
    tr: { value: `Sentetik yapı ${n}`, status, sources: s },
    la: { value: `Structura synthetica ${n}`, status, sources: s },
    en: { value: `Synthetic structure ${n}`, status, sources: s },
  }
}

const APPROVED_REVIEW = { text: 'approved', labels: 'approved', geometry: 'approved', relations: 'approved' } as const

function st(id: string, extra: Partial<StructureInput> = {}) {
  const n = id.slice(3)
  return structureSchema.parse({
    id,
    schemaVersion: 1,
    kind: 'bone',
    names: names(n),
    systems: ['skeletal'],
    regions: ['arm'],
    laterality: 'not_applicable',
    detailLevel: 'basic',
    provenance: { createdBy: 'author:human', createdAt: DATE, updatedAt: DATE },
    ...extra,
  })
}

export const structures = [
  st('ax:0001'),
  st('ax:0002', { synonyms: [{ value: 'Sentetik eşanlam 02', lang: 'tr', kind: 'synonym', sources: [] }] }),
  st('ax:0003', { detailLevel: 'intermediate' }),
  st('ax:0004', { detailLevel: 'advanced', regions: ['lower_limb'] }),
  st('ax:0005', { regions: ['lower_limb'], review: { text: 'draft', labels: 'expert_review_pending', geometry: 'expert_review_pending', relations: 'draft' } }),
  // Sided pair with a side-independent concept and a part of the right instance.
  st('ax:0010', { laterality: 'right', counterpartId: 'ax:0011', genericId: 'ax:0012' }),
  st('ax:0011', { laterality: 'left', counterpartId: 'ax:0010', genericId: 'ax:0012' }),
  st('ax:0012', { laterality: 'paired_generic' }),
  st('ax:0013', { kind: 'bone_part', laterality: 'right', parentIds: ['ax:0010'] }),
  // Muscles.
  st('ax:0020', { kind: 'muscle', systems: ['muscular'] }),
  st('ax:0021', { kind: 'muscle', systems: ['muscular'] }),
  st('ax:0022', { kind: 'muscle', systems: ['muscular'] }),
  st('ax:0023', { kind: 'muscle', systems: ['muscular'], regions: ['lower_limb'] }),
  // Nerves without 3D models.
  st('ax:0030', { kind: 'nerve', systems: ['nervous'] }),
  st('ax:0031', { kind: 'nerve', systems: ['nervous'] }),
  st('ax:0032', { kind: 'nerve', systems: ['nervous'], regions: ['lower_limb'] }),
  st('ax:0033', { kind: 'nerve', systems: ['nervous'] }),
  // Data-quality exclusions.
  st('ax:0040', { names: names('0040', { sources: [] }) }),
  st('ax:0041', { names: names('0041', { sources: ref('src:does-not-exist') }) }),
  st('ax:0050', { module: 'embryology' }),
  st('ax:0051', { variation: { isVariant: true, sources: [] } }),
  st('ax:0052', { review: { text: 'draft', labels: 'needs_revision', geometry: 'draft', relations: 'draft' } }),
  // Approved records (test input only).
  st('ax:0060', { names: names('0060', { verified: true }), review: APPROVED_REVIEW }),
  st('ax:0061', { names: names('0061', { verified: true }), review: APPROVED_REVIEW }),
  st('ax:0062', { names: names('0062', { verified: true }), review: APPROVED_REVIEW }),
  st('ax:0063', { names: names('0063', { verified: true }), review: APPROVED_REVIEW }),
  // Only represented by schematic placeholder geometry.
  st('ax:0070'),
]

function node(structureId: string, i: number) {
  return {
    node: `n_${structureId.replace(':', '_')}`,
    structureId,
    triangles: 10,
    bbox: [i, 0, 0, i + 1, 1, 1],
    centroid: [i + 0.5, 0.5, 0.5],
  }
}

function asset(id: string, nodeIds: string[], extra: Record<string, unknown> = {}): ModelAsset {
  return assetSchema.parse({
    id,
    file: `models/${id.slice(6)}.glb`,
    format: 'glb',
    bytes: 0,
    sourceId: SRC_MODELS,
    coordinateFrame: 'anat-gltf-v1',
    representation: 'anatomical',
    lod: 'base',
    chunk: `test/${id.slice(6)}`,
    systems: ['skeletal'],
    label: { tr: `Sentetik model ${id.slice(6)}`, en: `Synthetic model ${id.slice(6)}` },
    nodes: nodeIds.map(node),
    provenance: [{ date: DATE, step: 'synthetic fixture', tool: 'vitest' }],
    ...extra,
  })
}

export const BASE_ASSET = 'asset:syn-base'
export const APPROVED_ASSET = 'asset:syn-approved'
export const SCHEMATIC_ASSET = 'asset:syn-schematic'
export const DETAIL_ASSET = 'asset:syn-detail'

export const assets = [
  asset(BASE_ASSET, [
    'ax:0001',
    'ax:0002',
    'ax:0003',
    'ax:0004',
    'ax:0005',
    'ax:0010',
    'ax:0011',
    'ax:0013',
    'ax:0020',
    'ax:0021',
    'ax:0022',
    'ax:0023',
    'ax:0040',
    'ax:0041',
    'ax:0050',
    'ax:0051',
    'ax:0052',
  ]),
  asset(APPROVED_ASSET, ['ax:0060', 'ax:0061', 'ax:0062', 'ax:0063'], { review: { geometry: 'approved' } }),
  asset(SCHEMATIC_ASSET, ['ax:0070'], { representation: 'schematic' }),
  asset(DETAIL_ASSET, ['ax:0003'], { lod: 'detail', detailFor: BASE_ASSET }),
]

function rel(id: string, type: Relation['type'], from: string, to: string, extra: Record<string, unknown> = {}): Relation {
  return relationSchema.parse({
    id,
    type,
    from,
    to,
    sources: ref(SRC_RELATIONS, id),
    verification: 'unverified',
    provenance: 'author:human',
    ...extra,
  })
}

/** A relation record whose sources were stripped (bypasses the schema's min(1) on purpose). */
const unsourced = (r: Relation): Relation => ({ ...r, sources: [] })

export const relations: Relation[] = [
  rel('rel:syn-1', 'insertion_on', 'ax:0020', 'ax:0002'),
  rel('rel:syn-2', 'innervated_by', 'ax:0020', 'ax:0030'),
  rel('rel:syn-3', 'innervated_by', 'ax:0020', 'ax:0031'),
  unsourced(rel('rel:syn-4', 'origin_on', 'ax:0021', 'ax:0001')),
  rel('rel:syn-5', 'articulates_with', 'ax:0001', 'ax:0002'),
  rel('rel:syn-6', 'insertion_on', 'ax:0022', 'ax:0003', { sources: ref('src:does-not-exist') }),
  rel('rel:syn-7', 'insertion_on', 'ax:0021', 'ax:0003', { isVariant: true }),
  rel('rel:syn-8', 'articulates_with', 'ax:0060', 'ax:0061', { review: 'approved', verification: 'expert_approved' }),
  rel('rel:syn-9', 'insertion_on', 'ax:0023', 'ax:0004', { review: 'needs_revision' }),
]

const q = (input: Record<string, unknown>) =>
  questionSchema.parse({ level: 'basic', sources: ref(SRC_QUESTIONS), provenance: 'author:human', ...input })

export const questions = [
  q({
    id: 'q:syn-find-1',
    type: 'find',
    prompt: 'Sentetik hazır soru: modelde Sentetik yapı 0005 yapısını seçin.',
    target: 'ax:0005',
    answer: { structureId: 'ax:0005' },
    explanation: 'Sentetik açıklama (test).',
  }),
  q({
    id: 'q:syn-mcq-1',
    type: 'mcq',
    systems: ['skeletal'],
    regions: ['arm'],
    prompt: 'Sentetik hazır çoktan seçmeli soru (test).',
    options: [
      { id: 'x', text: 'Sentetik seçenek X' },
      { id: 'y', text: 'Sentetik seçenek Y' },
      { id: 'z', text: 'Sentetik seçenek Z' },
    ],
    answer: { optionId: 'y' },
    explanation: 'Sentetik açıklama (test).',
  }),
  q({
    id: 'q:syn-unsourced',
    type: 'mcq',
    systems: ['skeletal'],
    regions: ['arm'],
    prompt: 'Kaynağı çözülemeyen sentetik soru (test).',
    options: [
      { id: 'x', text: 'Sentetik seçenek X' },
      { id: 'y', text: 'Sentetik seçenek Y' },
    ],
    answer: { optionId: 'x' },
    explanation: 'Sentetik açıklama (test).',
    sources: ref('src:does-not-exist'),
  }),
  q({
    id: 'q:syn-section-1',
    type: 'section',
    level: 'advanced',
    prompt: 'Sentetik kesit sorusu: kesitte Sentetik yapı 0004 yapısını seçin.',
    target: 'ax:0004',
    requiresVisible: ['ax:0004'],
    answer: { structureId: 'ax:0004' },
    explanation: 'Sentetik açıklama (test).',
  }),
  q({
    id: 'q:syn-nomodel',
    type: 'find',
    prompt: 'Modeli olmayan sentetik yapı sorusu (test).',
    target: 'ax:0030',
    answer: { structureId: 'ax:0030' },
    explanation: 'Sentetik açıklama (test).',
  }),
]

export const lesson = lessonSchema.parse({
  id: 'lesson:syn-tour',
  title: 'Sentetik ders (test)',
  level: 'basic',
  objectives: [{ id: 'o1', text: 'Sentetik hedef (test)' }],
  steps: [
    {
      id: 's1',
      title: 'Adım 1',
      body: 'Sentetik adım metni 1.',
      show: ['ax:0001', 'ax:0002'],
      focus: ['ax:0001'],
      isolate: true,
      camera: 'anterior',
      sources: ref(SRC_TERMS),
    },
    {
      id: 's2',
      title: 'Adım 2',
      body: 'Sentetik adım metni 2.',
      show: ['ax:0030', 'ax:0020'],
      focus: ['ax:0020'],
      sources: ref(SRC_TERMS),
    },
    {
      id: 's3',
      title: 'Adım 3',
      body: 'Sentetik adım metni 3.',
      focus: ['ax:9999'],
      sources: ref(SRC_TERMS),
    },
  ],
  provenance: 'author:human',
})

export function syntheticBundle(): ContentBundle {
  return {
    manifest: { schemaVersion: 1, contentVersion: 'synthetic-test', generatedAt: DATE, counts: {}, files: {} },
    systems: [],
    regions: [
      { id: 'upper_limb', name: { tr: 'Üst ekstremite', en: 'Upper limb' }, order: 0 },
      { id: 'arm', parentId: 'upper_limb', name: { tr: 'Kol', en: 'Arm' }, order: 1 },
      { id: 'lower_limb', name: { tr: 'Alt ekstremite', en: 'Lower limb' }, order: 2 },
    ],
    structures,
    relations,
    sources,
    assets,
    lessons: [lesson],
    questions,
    reviews: [],
    scope: [],
  }
}

export function syntheticIndex(): ContentIndex {
  return createContentIndex(syntheticBundle())
}
