/**
 * Local user data store (guest mode). See UserDataStore in ./types.ts.
 *
 *  - IndexedDB via idb; object stores: notes (index structureId), favorites, progress,
 *    views, quizAttempts, errorReports, settings. Versioned upgrades in ./storage.ts.
 *  - Every record is validated with the zod schemas of src/core/schema.ts on write and
 *    on import; invalid input throws a UserDataError with a Turkish message.
 *  - "Viewed" (recordView) and "answered" (recordAnswer) are tracked separately.
 *  - When IndexedDB is unavailable (private mode, blocked storage) the store falls back to
 *    memory with the same behaviour and `persistent: false`.
 */
import type { z } from 'zod'
import {
  errorReportSchema,
  favoriteSchema,
  noteSchema,
  progressSchema,
  quizAttemptSchema,
  savedViewSchema,
  structureId as structureIdSchema,
  userExportSchema,
  type Favorite,
  type Note,
  type Progress,
  type SavedView,
  type StructureId,
  type UserExport,
} from '../core/schema.ts'
import { pickValidSettings, sanitizeSettings, userSettingsSchema } from './settings.ts'
import { clampQuality, reviewSm2 } from './srs.ts'
import {
  createMemoryBackend,
  KEY_PATHS,
  openIdbBackend,
  STORE_NAMES,
  type StorageBackend,
  type StoreName,
  type StoreRecords,
  type StoreTx,
} from './storage.ts'
import type { UserDataStore, UserSettings } from './types.ts'

export const DEFAULT_USER_DB_NAME = 'anatomi-3b-user'
const SETTINGS_KEY = 'user'

export type UserDataErrorCode = 'validation' | 'import' | 'storage'

/** Error with a user-facing Turkish message; `issues` lists invalid fields when known. */
export class UserDataError extends Error {
  readonly code: UserDataErrorCode
  readonly issues: string[]
  constructor(code: UserDataErrorCode, message: string, options: { cause?: unknown; issues?: string[] } = {}) {
    super(message, { cause: options.cause })
    this.name = 'UserDataError'
    this.code = code
    this.issues = options.issues ?? []
  }
}

export interface UserStoreOptions {
  /** Clock for timestamps (tests). */
  now?: () => Date
}

export interface OpenUserDbOptions extends UserStoreOptions {
  /** Give up on IndexedDB (and use memory) if it does not open in time. Default 8000 ms. */
  timeoutMs?: number
}

export type LocalUserDataStore = UserDataStore & { readonly persistent: boolean; close(): void }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UUID v4; falls back to getRandomValues where randomUUID is missing (plain-http pages). */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function issuePaths(error: z.ZodError): string[] {
  const paths = error.issues.map((i) => (i.path.length > 0 ? i.path.map(String).join('.') : '(kök)'))
  return [...new Set(paths)]
}

function validate<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const r = schema.safeParse(value)
  if (r.success) return r.data
  const issues = issuePaths(r.error)
  throw new UserDataError('validation', `${what} geçersiz (${issues.slice(0, 5).join(', ')}).`, {
    cause: r.error,
    issues,
  })
}

function requireStructureId(id: unknown): StructureId {
  return validate(structureIdSchema, id, 'Yapı kimliği')
}

/** Drops keys whose value is undefined (keeps stored records and exports tidy). */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

const time = (iso: string | undefined): number => {
  if (!iso) return Number.NEGATIVE_INFINITY
  const t = Date.parse(iso)
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}
const later = (a?: string, b?: string) => (time(b) > time(a) ? b : a) ?? b
const earlier = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : time(b) < time(a) ? b : a)

const newestFirst =
  <T>(key: (x: T) => string | undefined) =>
  (a: T, b: T) =>
    time(key(b)) - time(key(a))

const lastActivity = (p: Progress) => later(p.lastViewedAt, p.lastAnsweredAt)

/** Field-wise merge used by import(merge); idempotent (importing twice changes nothing). */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const answered = time(b.lastAnsweredAt) > time(a.lastAnsweredAt) ? b : a
  const other = answered === a ? b : a
  return compact({
    structureId: a.structureId,
    viewCount: Math.max(a.viewCount, b.viewCount),
    firstViewedAt: earlier(a.firstViewedAt, b.firstViewedAt),
    lastViewedAt: later(a.lastViewedAt, b.lastViewedAt),
    attempts: Math.max(a.attempts, b.attempts),
    correct: Math.max(a.correct, b.correct),
    lastAnsweredAt: answered.lastAnsweredAt ?? other.lastAnsweredAt,
    lastResult: answered.lastResult ?? other.lastResult,
    srs: answered.srs ?? other.srs,
  })
}

const keyOf = <K extends StoreName>(store: K, record: StoreRecords[K]): string =>
  String((record as unknown as Record<string, unknown>)[KEY_PATHS[store]])

function emptyProgress(id: StructureId): Progress {
  return { structureId: id, viewCount: 0, attempts: 0, correct: 0 }
}

/** Deep equality for plain JSON-like records (key order independent). */
function sameRecord(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined)
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined)
  if (ka.length !== kb.length) return false
  return ka.every((k) => sameRecord((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Builds the full UserDataStore on top of a storage backend. */
export function createUserStore(backend: StorageBackend, options: UserStoreOptions = {}): LocalUserDataStore {
  const clock = options.now ?? (() => new Date())
  const nowIso = () => clock().toISOString()

  const guard = async <T>(kind: 'read' | 'write', op: () => Promise<T>): Promise<T> => {
    try {
      return await op()
    } catch (err) {
      if (err instanceof UserDataError) throw err
      throw new UserDataError(
        'storage',
        kind === 'read'
          ? 'Kayıtlı veriler okunamadı. Tarayıcı depolaması kullanılamıyor olabilir.'
          : 'Veriler kaydedilemedi. Tarayıcı depolaması dolu ya da kullanılamıyor olabilir.',
        { cause: err },
      )
    }
  }
  const read = <T>(op: () => Promise<T>) => guard('read', op)
  const write = <T>(stores: readonly StoreName[], fn: (tx: StoreTx) => Promise<T>) =>
    guard('write', () => backend.transaction(stores, 'readwrite', fn))

  const readSettings = async (tx?: StoreTx): Promise<UserSettings> => {
    const rec = tx ? await tx.get('settings', SETTINGS_KEY) : await backend.get('settings', SETTINGS_KEY)
    return sanitizeSettings(rec?.value)
  }

  const store: LocalUserDataStore = {
    persistent: backend.persistent,
    close: () => backend.close(),

    // ----- notes -----
    listNotes: (structureId) =>
      read(async () => {
        const notes = structureId === undefined ? await backend.getAll('notes') : await backend.notesFor(structureId)
        return notes.sort(newestFirst((n: Note) => n.updatedAt))
      }),

    putNote: (input) => {
      if (typeof input.text !== 'string' || input.text.trim() === '') {
        return Promise.reject(new UserDataError('validation', 'Not metni boş olamaz.', { issues: ['text'] }))
      }
      return write(['notes'], async (tx) => {
        const id = input.id ?? newId()
        const existing = input.id !== undefined ? await tx.get('notes', id) : undefined
        const ts = nowIso()
        const note = validate(
          noteSchema,
          compact({ id, structureId: input.structureId, text: input.text, createdAt: existing?.createdAt ?? ts, updatedAt: ts }),
          'Not',
        )
        await tx.put('notes', note)
        return note
      })
    },

    deleteNote: (id) => write(['notes'], (tx) => tx.delete('notes', id)),

    // ----- favorites -----
    listFavorites: () => read(async () => (await backend.getAll('favorites')).sort(newestFirst((f: Favorite) => f.createdAt))),

    isFavorite: (id) => read(async () => (await backend.get('favorites', id)) !== undefined),

    toggleFavorite: async (id) => {
      const sid = requireStructureId(id)
      return write(['favorites'], async (tx) => {
        if (await tx.get('favorites', sid)) {
          await tx.delete('favorites', sid)
          return false
        }
        await tx.put('favorites', validate(favoriteSchema, { structureId: sid, createdAt: nowIso() }, 'Favori'))
        return true
      })
    },

    // ----- progress -----
    getProgress: (id) => read(() => backend.get('progress', id)),

    listProgress: () => read(async () => (await backend.getAll('progress')).sort(newestFirst(lastActivity))),

    recordView: async (id, now) => {
      const sid = requireStructureId(id)
      const at = (now ?? clock()).toISOString()
      return write(['progress'], async (tx) => {
        const prev = (await tx.get('progress', sid)) ?? emptyProgress(sid)
        const next = validate(
          progressSchema,
          { ...prev, viewCount: prev.viewCount + 1, firstViewedAt: prev.firstViewedAt ?? at, lastViewedAt: at },
          'İlerleme kaydı',
        )
        await tx.put('progress', next)
        return next
      })
    },

    recordAnswer: async (id, correct, quality, now) => {
      const sid = requireStructureId(id)
      const date = now ?? clock()
      const at = date.toISOString()
      // Keep SM-2 consistent with the answer: correct => q >= 3, incorrect => q <= 2.
      const q = clampQuality(quality)
      const effective = correct ? Math.max(3, q) : Math.min(2, q)
      return write(['progress'], async (tx) => {
        const prev = (await tx.get('progress', sid)) ?? emptyProgress(sid)
        const next = validate(
          progressSchema,
          {
            ...prev,
            attempts: prev.attempts + 1,
            correct: prev.correct + (correct ? 1 : 0),
            lastAnsweredAt: at,
            lastResult: correct ? 'correct' : 'incorrect',
            srs: reviewSm2(prev.srs, effective, date),
          },
          'İlerleme kaydı',
        )
        await tx.put('progress', next)
        return next
      })
    },

    // ----- saved views -----
    listViews: () => read(async () => (await backend.getAll('views')).sort(newestFirst((v: SavedView) => v.createdAt))),

    saveView: (input) => {
      if (typeof input.name !== 'string' || input.name.trim() === '') {
        return Promise.reject(new UserDataError('validation', 'Görünüm adı boş olamaz.', { issues: ['name'] }))
      }
      return write(['views'], async (tx) => {
        const id = input.id ?? newId()
        const existing = input.id !== undefined ? await tx.get('views', id) : undefined
        const view = validate(
          savedViewSchema,
          compact({
            id,
            name: input.name.trim(),
            createdAt: existing?.createdAt ?? nowIso(),
            contentVersion: input.contentVersion,
            scene: input.scene,
          }),
          'Kaydedilmiş görünüm',
        )
        await tx.put('views', view)
        return view
      })
    },

    deleteView: (id) => write(['views'], (tx) => tx.delete('views', id)),

    // ----- quiz history -----
    addQuizAttempt: async (attempt) => {
      const a = validate(quizAttemptSchema, attempt, 'Sınav kaydı')
      await write(['quizAttempts'], (tx) => tx.put('quizAttempts', a))
    },

    listQuizAttempts: () => read(async () => (await backend.getAll('quizAttempts')).sort(newestFirst((a) => a.startedAt))),

    // ----- error reports -----
    addErrorReport: async (input) => {
      const report = validate(
        errorReportSchema,
        compact({ ...input, id: newId(), createdAt: nowIso(), status: 'local' as const }),
        'Hata bildirimi',
      )
      await write(['errorReports'], (tx) => tx.put('errorReports', report))
      return report
    },

    listErrorReports: () => read(async () => (await backend.getAll('errorReports')).sort(newestFirst((r) => r.createdAt))),

    markReportsExported: async (ids) => {
      await write(['errorReports'], async (tx) => {
        for (const id of new Set(ids)) {
          const r = await tx.get('errorReports', id)
          if (r && r.status !== 'exported') await tx.put('errorReports', { ...r, status: 'exported' })
        }
      })
    },

    // ----- settings -----
    getSettings: () => read(() => readSettings()),

    setSettings: (patch) =>
      write(['settings'], async (tx) => {
        const merged = validate(userSettingsSchema, { ...(await readSettings(tx)), ...patch }, 'Ayarlar')
        await tx.put('settings', { key: SETTINGS_KEY, value: merged })
        return merged
      }),

    // ----- data rights -----
    exportAll: () =>
      read(() =>
        backend.transaction(STORE_NAMES, 'readonly', async (tx) => {
          // Sorted by key so that exports are stable whatever the backend.
          const all = async <K extends Exclude<StoreName, 'settings'>>(store: K) =>
            (await tx.getAll(store)).sort((a, b) => {
              const ka = keyOf(store, a)
              const kb = keyOf(store, b)
              return ka < kb ? -1 : ka > kb ? 1 : 0
            })
          const [notes, favorites, progress, savedViews, quizAttempts, errorReports, settings] = await Promise.all([
            all('notes'),
            all('favorites'),
            all('progress'),
            all('views'),
            all('quizAttempts'),
            all('errorReports'),
            readSettings(tx),
          ])
          const data: UserExport = {
            format: 'anatomi-3b-user-export',
            version: 1,
            exportedAt: nowIso(),
            notes,
            favorites,
            progress,
            savedViews,
            quizAttempts,
            errorReports,
            settings: { ...settings },
          }
          return validate(userExportSchema, data, 'Dışa aktarılan veri')
        }),
      ),

    importAll: async (raw, mode) => {
      if (mode !== 'merge' && mode !== 'replace') {
        throw new UserDataError('validation', 'İçe aktarma kipi "merge" ya da "replace" olmalı.')
      }
      let input = raw
      if (typeof input === 'string') {
        try {
          input = JSON.parse(input) as unknown
        } catch (err) {
          throw new UserDataError('import', 'Yedek dosyası okunamadı: geçerli bir JSON değil.', { cause: err })
        }
      }
      const parsed = userExportSchema.safeParse(input)
      if (!parsed.success) {
        const issues = issuePaths(parsed.error)
        throw new UserDataError(
          'import',
          `Yedek dosyası geçersiz ya da bu uygulamanın biçimine uymuyor (${issues.slice(0, 5).join(', ')}). Hiçbir veri değiştirilmedi.`,
          { cause: parsed.error, issues },
        )
      }
      const data = parsed.data
      // Last occurrence wins for duplicate keys inside the file.
      const byKey = <K extends Exclude<StoreName, 'settings'>>(store: K, list: StoreRecords[K][]) =>
        new Map(list.map((r) => [keyOf(store, r), r]))
      const incoming = {
        notes: byKey('notes', data.notes),
        favorites: byKey('favorites', data.favorites),
        progress: byKey('progress', data.progress),
        views: byKey('views', data.savedViews),
        quizAttempts: byKey('quizAttempts', data.quizAttempts),
        errorReports: byKey('errorReports', data.errorReports),
      }
      const importedSettings = pickValidSettings(data.settings)

      return write(STORE_NAMES, async (tx) => {
        let imported = 0
        if (mode === 'replace') {
          for (const s of STORE_NAMES) await tx.clear(s)
          for (const r of incoming.notes.values()) await tx.put('notes', r)
          for (const r of incoming.favorites.values()) await tx.put('favorites', r)
          for (const r of incoming.progress.values()) await tx.put('progress', r)
          for (const r of incoming.views.values()) await tx.put('views', r)
          for (const r of incoming.quizAttempts.values()) await tx.put('quizAttempts', r)
          for (const r of incoming.errorReports.values()) await tx.put('errorReports', r)
          for (const m of Object.values(incoming)) imported += m.size
          if (Object.keys(importedSettings).length > 0) {
            await tx.put('settings', { key: SETTINGS_KEY, value: { ...sanitizeSettings(importedSettings) } })
          }
          return { imported }
        }

        // merge: union by key. Notes: most recently updated wins. Progress: field-wise
        // merge. Other records (no update time): the local copy is kept. Local settings
        // are kept (use "replace" to restore settings from a backup).
        for (const r of incoming.notes.values()) {
          const cur = await tx.get('notes', r.id)
          if (!cur || time(r.updatedAt) > time(cur.updatedAt)) {
            await tx.put('notes', r)
            imported++
          }
        }
        for (const r of incoming.progress.values()) {
          const cur = await tx.get('progress', r.structureId)
          const next = cur ? mergeProgress(cur, r) : r
          if (!cur || !sameRecord(next, cur)) {
            await tx.put('progress', next)
            imported++
          }
        }
        const addMissing = async <K extends 'favorites' | 'views' | 'quizAttempts' | 'errorReports'>(
          store: K,
          records: Map<string, StoreRecords[K]>,
        ) => {
          for (const [key, r] of records) {
            if (await tx.get(store, key)) continue
            await tx.put(store, r)
            imported++
          }
        }
        await addMissing('favorites', incoming.favorites)
        await addMissing('views', incoming.views)
        await addMissing('quizAttempts', incoming.quizAttempts)
        await addMissing('errorReports', incoming.errorReports)
        return { imported }
      })
    },

    deleteAll: () =>
      write(STORE_NAMES, async (tx) => {
        for (const s of STORE_NAMES) await tx.clear(s)
      }),
  }
  return store
}

/** In-memory store with the same behaviour (nothing survives a page reload). */
export function createMemoryUserStore(options: UserStoreOptions = {}): LocalUserDataStore {
  return createUserStore(createMemoryBackend(), options)
}

/**
 * Opens the local user database. Never rejects because storage is unavailable: falls back
 * to memory and reports `persistent: false`, so the UI can tell the user that notes and
 * progress will be lost when the page is closed.
 */
export async function openUserDb(name = DEFAULT_USER_DB_NAME, options: OpenUserDbOptions = {}): Promise<LocalUserDataStore> {
  try {
    const backend = await openIdbBackend(name, options.timeoutMs)
    return createUserStore(backend, options)
  } catch (err) {
    console.warn('IndexedDB kullanılamıyor; kullanıcı verileri yalnızca bu oturum boyunca bellekte tutulacak.', err)
    return createMemoryUserStore(options)
  }
}
