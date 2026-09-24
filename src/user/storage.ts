/**
 * Storage backends for local user data: IndexedDB (persistent) and in-memory (fallback
 * when IndexedDB is unavailable, e.g. in some private-browsing modes).
 *
 * Both expose the same small, atomic API; all domain logic (validation, SRS, merging)
 * lives in ./userDb.ts and is shared.
 */
import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import type { ErrorReport, Favorite, Note, Progress, QuizAttempt, SavedView } from '../core/schema.ts'

/** Bump when the object store layout changes, and add a step to `upgradeUserDb`. */
export const USER_DB_VERSION = 1

export const STORE_NAMES = ['notes', 'favorites', 'progress', 'views', 'quizAttempts', 'errorReports', 'settings'] as const
export type StoreName = (typeof STORE_NAMES)[number]

export interface SettingsRecord {
  key: string
  value: Record<string, unknown>
}

export interface StoreRecords {
  notes: Note
  favorites: Favorite
  progress: Progress
  views: SavedView
  quizAttempts: QuizAttempt
  errorReports: ErrorReport
  settings: SettingsRecord
}

export const KEY_PATHS = {
  notes: 'id',
  favorites: 'structureId',
  progress: 'structureId',
  views: 'id',
  quizAttempts: 'id',
  errorReports: 'id',
  settings: 'key',
} as const satisfies { [K in StoreName]: keyof StoreRecords[K] & string }

export interface UserDbSchema extends DBSchema {
  notes: { key: string; value: Note; indexes: { structureId: string } }
  favorites: { key: string; value: Favorite }
  progress: { key: string; value: Progress }
  views: { key: string; value: SavedView }
  quizAttempts: { key: string; value: QuizAttempt }
  errorReports: { key: string; value: ErrorReport }
  settings: { key: string; value: SettingsRecord }
}

/** Operations available inside a transaction. */
export interface StoreTx {
  get<K extends StoreName>(store: K, key: string): Promise<StoreRecords[K] | undefined>
  getAll<K extends StoreName>(store: K): Promise<StoreRecords[K][]>
  put<K extends StoreName>(store: K, value: StoreRecords[K]): Promise<void>
  delete(store: StoreName, key: string): Promise<void>
  clear(store: StoreName): Promise<void>
}

export interface StorageBackend {
  readonly persistent: boolean
  getAll<K extends StoreName>(store: K): Promise<StoreRecords[K][]>
  get<K extends StoreName>(store: K, key: string): Promise<StoreRecords[K] | undefined>
  notesFor(structureId: string): Promise<Note[]>
  /**
   * Runs `fn` atomically over the listed stores: either all of its writes are applied or,
   * if it throws, none. `fn` must only await operations of `tx` (IndexedDB transactions
   * commit as soon as they have nothing pending).
   */
  transaction<T>(stores: readonly StoreName[], mode: 'readonly' | 'readwrite', fn: (tx: StoreTx) => Promise<T>): Promise<T>
  close(): void
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

/** Versioned schema migration. Never edit a released step; append a new one. */
export function upgradeUserDb(db: IDBPDatabase<UserDbSchema>, oldVersion: number): void {
  if (oldVersion < 1) {
    const notes = db.createObjectStore('notes', { keyPath: KEY_PATHS.notes })
    notes.createIndex('structureId', 'structureId', { unique: false })
    db.createObjectStore('favorites', { keyPath: KEY_PATHS.favorites })
    db.createObjectStore('progress', { keyPath: KEY_PATHS.progress })
    db.createObjectStore('views', { keyPath: KEY_PATHS.views })
    db.createObjectStore('quizAttempts', { keyPath: KEY_PATHS.quizAttempts })
    db.createObjectStore('errorReports', { keyPath: KEY_PATHS.errorReports })
    db.createObjectStore('settings', { keyPath: KEY_PATHS.settings })
  }
  // if (oldVersion < 2) { ... }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onLate: (value: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      settled = true
      reject(new Error(`IndexedDB ${ms} ms içinde açılamadı`))
    }, ms)
    promise.then(
      (value) => {
        if (settled) return onLate(value)
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

type LooseTx = IDBPTransaction<unknown, string[], IDBTransactionMode>

/**
 * Opens (and creates/upgrades) the database. Rejects when IndexedDB is missing, refuses
 * to open, does not answer within `timeoutMs`, or rejects writes (probe).
 */
export async function openIdbBackend(name: string, timeoutMs = 8000): Promise<StorageBackend> {
  if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB bu ortamda yok')
  const opening = openDB<UserDbSchema>(name, USER_DB_VERSION, {
    upgrade: (database, oldVersion) => upgradeUserDb(database, oldVersion),
    // Another tab needs a newer version: let it proceed. Later operations in this tab
    // then fail with a storage error until the page is reloaded.
    blocking: (_current, _blocked, event) => (event.target as IDBDatabase | null)?.close(),
  })
  const conn = await withTimeout(opening, timeoutMs, (late) => late.close())

  // Some private modes open the database but reject every write.
  try {
    const probe = conn.transaction('settings', 'readwrite')
    await probe.store.put({ key: '__probe__', value: {} })
    await probe.store.delete('__probe__')
    await probe.done
  } catch (err) {
    conn.close()
    throw err
  }

  const view = (tx: LooseTx): StoreTx => ({
    get: (store, key) => tx.objectStore(store).get(key),
    getAll: (store) => tx.objectStore(store).getAll(),
    put: async (store, value) => {
      await tx.objectStore(store).put!(value)
    },
    delete: (store, key) => tx.objectStore(store).delete!(key),
    clear: (store) => tx.objectStore(store).clear!(),
  })

  return {
    persistent: true,
    getAll: <K extends StoreName>(store: K) => conn.getAll(store) as Promise<StoreRecords[K][]>,
    get: <K extends StoreName>(store: K, key: string) => conn.get(store, key) as Promise<StoreRecords[K] | undefined>,
    notesFor: (structureId) => conn.getAllFromIndex('notes', 'structureId', structureId),
    async transaction(stores, mode, fn) {
      const tx = conn.transaction([...stores], mode) as unknown as LooseTx
      const done = tx.done
      // Observed below; avoid an unhandled rejection when we abort on purpose.
      done.catch(() => undefined)
      let result
      try {
        result = await fn(view(tx))
      } catch (err) {
        try {
          tx.abort()
        } catch {
          // already committed or aborted
        }
        throw err
      }
      await done
      return result
    },
    close: () => conn.close(),
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

const clone = <T>(v: T): T => structuredClone(v)

export function createMemoryBackend(): StorageBackend {
  let data = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((s) => [s, new Map()]))
  let queue: Promise<unknown> = Promise.resolve()
  const table = (store: StoreName) => data.get(store)!
  const keyOf = <K extends StoreName>(store: K, value: StoreRecords[K]): string =>
    String((value as unknown as Record<string, unknown>)[KEY_PATHS[store]])

  return {
    persistent: false,
    getAll: async <K extends StoreName>(store: K) => [...table(store).values()].map((v) => clone(v as StoreRecords[K])),
    get: async <K extends StoreName>(store: K, key: string) => {
      const v = table(store).get(key)
      return v === undefined ? undefined : clone(v as StoreRecords[K])
    },
    notesFor: async (structureId) =>
      [...table('notes').values()].map((v) => v as Note).filter((n) => n.structureId === structureId).map(clone),
    transaction<T>(stores: readonly StoreName[], mode: 'readonly' | 'readwrite', fn: (tx: StoreTx) => Promise<T>) {
      const run = async (): Promise<T> => {
        // Writes go to copies that replace the live tables only if `fn` succeeds.
        const staged = new Map(stores.map((s) => [s, new Map(table(s))]))
        const scoped = (store: StoreName) => {
          const t = staged.get(store)
          if (!t) throw new Error(`"${store}" deposu bu işlemin kapsamında değil`)
          return t
        }
        const writable = (store: StoreName) => {
          if (mode !== 'readwrite') throw new Error('Salt okunur işlemde yazma denendi')
          return scoped(store)
        }
        const tx: StoreTx = {
          get: async <K extends StoreName>(store: K, key: string) => {
            const v = scoped(store).get(key)
            return v === undefined ? undefined : clone(v as StoreRecords[K])
          },
          getAll: async <K extends StoreName>(store: K) => [...scoped(store).values()].map((v) => clone(v as StoreRecords[K])),
          put: async (store, value) => {
            writable(store).set(keyOf(store, value), clone(value))
          },
          delete: async (store, key) => {
            writable(store).delete(key)
          },
          clear: async (store) => {
            writable(store).clear()
          },
        }
        const result = await fn(tx)
        if (mode === 'readwrite') {
          const next = new Map(data)
          for (const [s, t] of staged) next.set(s, t)
          data = next
        }
        return result
      }
      // Serialize transactions, like IndexedDB does for overlapping readwrite scopes.
      const p = queue.then(run, run)
      queue = p.catch(() => undefined)
      return p
    },
    close: () => undefined,
  }
}
