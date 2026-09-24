/**
 * Content layer contract. The compiled bundle (public/data/*.json) is produced by
 * scripts/content/build-content.ts and loaded by src/data/loader.ts.
 */
import type {
  ContentManifest,
  Lesson,
  ModelAsset,
  Question,
  RegionRecord,
  Relation,
  RelationType,
  ReviewRecord,
  ScopeTarget,
  Source,
  Structure,
  StructureId,
  SystemId,
  SystemRecord,
} from '../core/schema.ts'
import type { VisibilityGraph } from '../state/visibility.ts'

/** Files in public/data (paths relative to the app base). */
export const DATA_FILES = {
  manifest: 'data/manifest.json',
  taxonomy: 'data/taxonomy.json',
  structures: 'data/structures.json',
  relations: 'data/relations.json',
  sources: 'data/sources.json',
  assets: 'data/assets.json',
  lessons: 'data/lessons.json',
  questions: 'data/questions.json',
  reviews: 'data/reviews.json',
  scope: 'data/scope.json',
} as const

export interface ContentBundle {
  manifest: ContentManifest
  systems: SystemRecord[]
  regions: RegionRecord[]
  structures: Structure[]
  relations: Relation[]
  sources: Source[]
  assets: ModelAsset[]
  lessons: Lesson[]
  questions: Question[]
  reviews: ReviewRecord[]
  scope: ScopeTarget[]
}

export interface NodeRef {
  assetId: string
  node: string
}

export interface RelationView {
  relation: Relation
  /** The structure on the other end of the relation. */
  otherId: StructureId
  /** 'forward' when the viewed structure is relation.from. */
  direction: 'forward' | 'inverse'
}

/** Indexed, read-only access to the content graph. Implemented in src/data/contentIndex.ts. */
export interface ContentIndex extends VisibilityGraph {
  readonly bundle: ContentBundle
  getStructure(id: StructureId): Structure | undefined
  getSource(id: string): Source | undefined
  getAsset(id: string): ModelAsset | undefined
  /** Direct part-of children. */
  childrenOf(id: StructureId): Structure[]
  /** Roots of the part-of hierarchy within a system (for the system tree). */
  systemRoots(system: SystemId): Structure[]
  /** Structures assigned to a region (and its sub-regions). */
  structuresInRegion(regionId: string): Structure[]
  /** All relations touching a structure, both directions, optionally filtered by type. */
  relationsOf(id: StructureId, types?: readonly RelationType[]): RelationView[]
  /** Model nodes representing the structure: its own nodes plus those of all part-of descendants. */
  nodesFor(id: StructureId): NodeRef[]
  /** Structure represented by a model node. */
  structureForNode(assetId: string, node: string): StructureId | undefined
  /** Assets needed to display a structure. */
  assetsFor(id: StructureId): string[]
  /** Display name in the requested language with graceful fallback (tr -> en). */
  displayName(id: StructureId, lang?: 'tr' | 'la' | 'en'): string
  /** Review records for a target. */
  reviewsFor(targetId: string): ReviewRecord[]
}
