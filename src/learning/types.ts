/**
 * Learning & assessment contract (implemented in src/learning/*).
 * Questions are generated from content records at runtime or loaded from authored
 * question files; every question links to structure records and cites sources.
 */
import type {
  DetailLevel,
  QuestionType,
  ReviewStatus,
  SourceRef,
  StructureId,
  SystemId,
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
}
