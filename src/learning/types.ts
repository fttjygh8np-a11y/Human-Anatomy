/**
 * Learning & assessment contract (implemented in src/learning/*).
 * Questions are generated from content records at runtime or loaded from authored
 * question files; every question links to structure records and cites sources.
 */
import type {
  CameraPreset,
  CONTENT_MODULES,
  DetailLevel,
  QuestionType,
  ReviewStatus,
  SourceRef,
  StructureId,
  SystemId,
  VisibilityMode,
} from '../core/schema.ts'

export type QuizMode = 'find' | 'name' | 'relation' | 'section' | 'review' | 'exam'

export interface QuizOption {
  id: string
  text: string
  structureId?: StructureId
}

export interface QuizQuestion {
  id: string
  type: QuestionType
  origin: 'generated' | 'authored'
  level: DetailLevel
  prompt: string
  /** Structure the question is about (for 'find': the structure to click). */
  target?: StructureId
  /** For 'name' questions: the highlighted structure whose name is asked. */
  highlight?: StructureId
  options?: QuizOption[]
  /** Accepts typed answers for 'name' questions (all accepted spellings). */
  acceptedAnswers?: string[]
  answer: { optionId?: string; structureId?: StructureId; text?: string }
  explanation: string
  sources: SourceRef[]
  /** Must be visible and selectable before the question is shown. */
  requiresVisible: StructureId[]
  /** Weakest review status among the records the question depends on. */
  reviewStatus: ReviewStatus
}

export interface QuizConfig {
  mode: QuizMode
  count: number
  systems?: SystemId[]
  regions?: string[]
  level?: DetailLevel
  /** Seconds for the whole quiz (exam mode). */
  timeLimitSec?: number
  onlyApproved?: boolean
  /** Seed for deterministic generation (tests, shareable exams). */
  seed: number
}

export interface QuizResponse {
  optionId?: string
  structureId?: StructureId | null
  text?: string
}

export interface GradeResult {
  correct: boolean
  /** SM-2 quality 0..5 derived from correctness and response time. */
  quality: number
  feedback: string
}

export interface GenerationReport {
  questions: QuizQuestion[]
  /** Why fewer questions than requested were produced (no silent caps). */
  shortfallReasons: string[]
  /** Structured counts of records left out of the question pool (always filled by generateQuiz). */
  exclusions?: GenerationExclusion[]
}

// ---------------------------------------------------------------------------
// Additions (src/learning implementation). Everything below is optional/additive so
// existing consumers of the contract above keep compiling.
// ---------------------------------------------------------------------------

/** Content modules (core = normal adult anatomy); mirrors CONTENT_MODULES in core/schema. */
export type ContentModuleId = (typeof CONTENT_MODULES)[number]

/** Name language used in prompts and options. */
export type NameLang = 'tr' | 'la' | 'en'

export interface QuizConfigExtras {
  /** Restrict the question types (default: all types that fit the mode). */
  types?: QuestionType[]
  /** Content modules to draw from (default: ['core']). */
  modules?: ContentModuleId[]
  /** Preferred name language for prompts/options (default 'tr', falls back to other sourced names). */
  lang?: NameLang
  /**
   * Allow 3D questions on structures represented only by schematic (placeholder) geometry.
   * Default false: placeholder geometry is not anatomically meaningful enough to test on.
   */
  allowSchematicModels?: boolean
}
// Declaration merging keeps QuizConfig's original fields untouched.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QuizConfig extends QuizConfigExtras {}

export interface QuizQuestionExtras {
  /** Systems/regions of the record the question is about (for filtering and per-system results). */
  systems?: SystemId[]
  regions?: string[]
  /** 3D picks counted as correct (the target and its part-of descendants). */
  acceptedStructureIds?: StructureId[]
  /** 3D picks that hit the opposite-side instance of the target (graded as "wrong side"). */
  wrongSideStructureIds?: StructureId[]
  /** Set when the answer is a sided instance: typed answers must state this side. */
  side?: 'right' | 'left'
  /** Structures to show after answering (explanation view). */
  relatedStructures?: StructureId[]
  /** Records whose review status and sources the question depends on. */
  dependsOn?: { structures: StructureId[]; relations: string[]; question?: string }
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QuizQuestion extends QuizQuestionExtras {}

export type GradeOutcome = 'correct' | 'correct_typo' | 'wrong_side' | 'missing_side' | 'incorrect' | 'no_answer'

export interface GradeResultExtras {
  outcome?: GradeOutcome
  /** Correct answer as shown to the learner. */
  expected?: string
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GradeResult extends GradeResultExtras {}

export type ExclusionReason =
  | 'missing_structure'
  | 'module'
  | 'variant'
  | 'needs_revision'
  | 'unsourced_name'
  | 'unsourced_relation'
  | 'unsourced_authored'
  | 'no_model'
  | 'schematic_model'
  | 'unanswerable_authored'
  | 'not_approved'
  | 'insufficient_distractors'
  | 'region_unassigned'

export interface GenerationExclusion {
  reason: ExclusionReason
  /** Number of distinct records (structures, relations or authored questions). */
  count: number
  /** Turkish explanation for the learner/editor. */
  message: string
}

/**
 * Declarative scene change. Store-level actions are applied atomically through the scene
 * store (one undo step); engine-level actions (loadAssets, highlight, focus, cameraPreset)
 * are routed to the 3D engine by the caller.
 */
export type SceneAction =
  | { type: 'loadAssets'; assetIds: string[] }
  | { type: 'restoreDissected'; ids: StructureId[] }
  | { type: 'clearIsolation' }
  | { type: 'isolate'; ids: StructureId[] }
  | { type: 'setVisibility'; ids: StructureId[]; mode: VisibilityMode }
  | { type: 'setSystemVisible'; system: SystemId; visible: boolean }
  | { type: 'setSystemOpacity'; system: SystemId; opacity: number }
  | { type: 'clearSelection' }
  | { type: 'select'; ids: StructureId[] }
  | { type: 'highlight'; ids: StructureId[]; style: 'relation' | 'quiz_target' | 'quiz_correct' | 'quiz_wrong' | 'lesson' | null }
  | { type: 'focus'; ids: StructureId[] }
  | { type: 'cameraPreset'; preset: CameraPreset }
