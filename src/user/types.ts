/**
 * Local user data contract (guest mode: IndexedDB in this browser only).
 * Implemented in src/user/userDb.ts. Account sync is out of scope for v0.x; if added, the
 * server must enforce per-user isolation of notes (see docs/mimari.md).
 */
import type {
  ErrorReport,
  Favorite,
  Note,
  Progress,
  QuizAttempt,
  SavedView,
  StructureId,
  UserExport,
} from '../core/schema.ts'

export interface UserSettings {
  theme: 'system' | 'light' | 'dark'
  reducedMotion: 'system' | 'on' | 'off'
  fontScale: number
  quality: 'auto' | 'low' | 'medium' | 'high'
  nameLanguage: 'tr' | 'la' | 'en'
  showSecondaryNames: boolean
  /** Generate questions only from expert-approved records. */
  onlyApprovedQuestions: boolean
  textMode: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  reducedMotion: 'system',
  fontScale: 1,
  quality: 'auto',
  nameLanguage: 'tr',
  showSecondaryNames: true,
  onlyApprovedQuestions: false,
  textMode: false,
}

export interface UserDataStore {
  // notes
  listNotes(structureId?: StructureId): Promise<Note[]>
  putNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note>
  deleteNote(id: string): Promise<void>
  // favorites
  listFavorites(): Promise<Favorite[]>
  isFavorite(id: StructureId): Promise<boolean>
  toggleFavorite(id: StructureId): Promise<boolean>
  // progress
  getProgress(id: StructureId): Promise<Progress | undefined>
  listProgress(): Promise<Progress[]>
  recordView(id: StructureId, now?: Date): Promise<Progress>
  /** Records an answer and updates the spaced-repetition state (quality 0..5, SM-2). */
  recordAnswer(id: StructureId, correct: boolean, quality: number, now?: Date): Promise<Progress>
  // saved views
  listViews(): Promise<SavedView[]>
  saveView(view: Omit<SavedView, 'id' | 'createdAt'> & { id?: string }): Promise<SavedView>
  deleteView(id: string): Promise<void>
  // quiz history
  addQuizAttempt(a: QuizAttempt): Promise<void>
  listQuizAttempts(): Promise<QuizAttempt[]>
  // error reports
  addErrorReport(r: Omit<ErrorReport, 'id' | 'createdAt' | 'status'>): Promise<ErrorReport>
  listErrorReports(): Promise<ErrorReport[]>
  markReportsExported(ids: string[]): Promise<void>
  // settings
  getSettings(): Promise<UserSettings>
  setSettings(patch: Partial<UserSettings>): Promise<UserSettings>
  // data rights
  exportAll(): Promise<UserExport>
  importAll(data: unknown, mode: 'merge' | 'replace'): Promise<{ imported: number }>
  deleteAll(): Promise<void>
  /**
   * false when IndexedDB is unavailable (e.g. private browsing) and data only lives in
   * memory for this session — the UI should say so. Undefined for stores that predate it.
   */
  readonly persistent?: boolean
  /** Releases the underlying connection (tests, upgrades from another tab). */
  close?(): void
}
