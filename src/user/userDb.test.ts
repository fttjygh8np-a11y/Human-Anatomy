import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneStateSchema, type QuizAttempt, type UserExport } from '../core/schema.ts'
import { createMemoryBackend, openIdbBackend, STORE_NAMES, USER_DB_VERSION, type StorageBackend } from './storage.ts'
import { DEFAULT_SETTINGS } from './types.ts'
import {
  createMemoryUserStore,
  mergeProgress,
  newId,
  openUserDb,
  UserDataError,
  type LocalUserDataStore,
  type UserStoreOptions,
} from './userDb.ts'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const scene = () => sceneStateSchema.parse({})

let dbCounter = 0
const uniqueName = () => `anatomi-test-${Date.now()}-${++dbCounter}`

/** Strictly increasing clock (1 s per call) so orderings are deterministic. */
const makeClock = (start = '2026-09-01T08:00:00.000Z') => {
  let t = Date.parse(start)
  return () => new Date((t += 1000))
}

const attempt = (id: string, startedAt: string): QuizAttempt => ({
  id,
  mode: 'find',
  startedAt,
  settings: {},
  items: [{ questionId: 'q:gen-1', structureId: 'ax:humerus', correct: true, answeredAt: startedAt, responseMs: 1200 }],
})

async function expectUserError(p: Promise<unknown>, code: UserDataError['code']) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(UserDataError)
  expect((err as UserDataError).code).toBe(code)
  expect((err as UserDataError).message).toMatch(/[çğıöşüÇĞİÖŞÜ]|geçersiz|boş/)
  return err as UserDataError
}

type Factory = (opts: UserStoreOptions) => Promise<LocalUserDataStore>
const factories: Array<[string, Factory]> = [
  ['IndexedDB', (opts) => openUserDb(uniqueName(), opts)],
  ['bellek', async (opts) => createMemoryUserStore(opts)],
]

describe.each(factories)('UserDataStore (%s)', (label, make) => {
  let store: LocalUserDataStore

  beforeEach(async () => {
    store = await make({ now: makeClock() })
  })
  afterEach(() => store.close())

  it('reports whether data is persistent', () => {
    expect(store.persistent).toBe(label === 'IndexedDB')
  })

  describe('notes', () => {
    it('creates, updates (keeping createdAt), lists by structure and deletes', async () => {
      const a = await store.putNote({ structureId: 'ax:humerus', text: 'Kol kemiği notu' })
      expect(a.id).toMatch(UUID_V4)
      expect(a.createdAt).toBe(a.updatedAt)

      const general = await store.putNote({ text: 'Genel not' })
      expect(general).not.toHaveProperty('structureId')
      await store.putNote({ structureId: 'ax:femur', text: 'Uyluk notu' })

      const updated = await store.putNote({ id: a.id, structureId: 'ax:humerus', text: 'Güncellendi' })
      expect(updated.id).toBe(a.id)
      expect(updated.createdAt).toBe(a.createdAt)
      expect(updated.updatedAt > a.updatedAt).toBe(true)

      const all = await store.listNotes()
      expect(all).toHaveLength(3)
      expect(all[0]?.id).toBe(a.id) // most recently updated first
      expect((await store.listNotes('ax:humerus')).map((n) => n.text)).toEqual(['Güncellendi'])
      expect(await store.listNotes('ax:tibia')).toEqual([])

      await store.deleteNote(a.id)
      expect(await store.listNotes('ax:humerus')).toEqual([])
      expect(await store.listNotes()).toHaveLength(2)
    })

    it('rejects invalid notes without writing', async () => {
      await expectUserError(store.putNote({ text: '   ' }), 'validation')
      const bad = await expectUserError(store.putNote({ structureId: 'humerus', text: 'x' }), 'validation')
      expect(bad.issues).toContain('structureId')
      await expectUserError(store.putNote({ text: 'a'.repeat(20001) }), 'validation')
      expect(await store.listNotes()).toEqual([])
    })
  })

  describe('favorites', () => {
    it('toggles', async () => {
      expect(await store.isFavorite('ax:humerus')).toBe(false)
      expect(await store.toggleFavorite('ax:humerus')).toBe(true)
      expect(await store.isFavorite('ax:humerus')).toBe(true)
      await store.toggleFavorite('ax:femur')
      const favs = await store.listFavorites()
      expect(favs.map((f) => f.structureId)).toEqual(['ax:femur', 'ax:humerus'])
      expect(await store.toggleFavorite('ax:humerus')).toBe(false)
      expect(await store.isFavorite('ax:humerus')).toBe(false)
      await expectUserError(store.toggleFavorite('not an id'), 'validation')
    })

    it('stays consistent under concurrent toggles', async () => {
      await Promise.all(Array.from({ length: 6 }, () => store.toggleFavorite('ax:humerus')))
      expect(await store.isFavorite('ax:humerus')).toBe(false)
    })
  })

  describe('progress', () => {
    it('tracks viewing and answering separately', async () => {
      const t1 = new Date('2026-09-10T09:00:00.000Z')
      const t2 = new Date('2026-09-11T09:00:00.000Z')
      await store.recordView('ax:humerus', t1)
      const viewed = await store.recordView('ax:humerus', t2)
      expect(viewed).toEqual({
        structureId: 'ax:humerus',
        viewCount: 2,
        firstViewedAt: t1.toISOString(),
        lastViewedAt: t2.toISOString(),
        attempts: 0,
        correct: 0,
      })

      const answered = await store.recordAnswer('ax:femur', true, 5, t1)
      expect(answered).toMatchObject({ viewCount: 0, attempts: 1, correct: 1, lastResult: 'correct' })
      expect(answered.lastAnsweredAt).toBe(t1.toISOString())
      expect(answered.srs).toMatchObject({ repetitions: 1, intervalDays: 1, lapses: 0 })
      expect(answered).not.toHaveProperty('lastViewedAt')

      expect(await store.getProgress('ax:humerus')).toEqual(viewed)
      expect(await store.getProgress('ax:tibia')).toBeUndefined()
      expect((await store.listProgress()).map((p) => p.structureId).sort()).toEqual(['ax:femur', 'ax:humerus'])
    })

    it('updates the SM-2 state and keeps quality consistent with correctness', async () => {
      const day = (n: number) => new Date(Date.parse('2026-09-10T09:00:00.000Z') + n * 86_400_000)
      await store.recordAnswer('ax:femur', true, 5, day(0))
      const second = await store.recordAnswer('ax:femur', true, 5, day(1))
      expect(second.srs).toMatchObject({ repetitions: 2, intervalDays: 6, dueAt: day(7).toISOString() })

      // Incorrect answer with a (contradictory) high quality is treated as a failure.
      const failed = await store.recordAnswer('ax:femur', false, 5, day(7))
      expect(failed).toMatchObject({ attempts: 3, correct: 2, lastResult: 'incorrect' })
      expect(failed.srs).toMatchObject({ repetitions: 0, intervalDays: 1, lapses: 1 })

      // Correct answer with a low quality still counts as a pass (q = 3).
      const passed = await store.recordAnswer('ax:tibia', true, 0)
      expect(passed.srs).toMatchObject({ repetitions: 1, lapses: 0 })
      expect(passed.srs?.ease).toBeCloseTo(2.36)
    })

    it('does not lose updates under concurrent writes', async () => {
      await Promise.all(Array.from({ length: 5 }, () => store.recordView('ax:humerus')))
      await Promise.all([store.recordAnswer('ax:humerus', true, 4), store.recordAnswer('ax:humerus', false, 1)])
      expect(await store.getProgress('ax:humerus')).toMatchObject({ viewCount: 5, attempts: 2, correct: 1 })
    })

    it('rejects invalid structure ids', async () => {
      await expectUserError(store.recordView('femur'), 'validation')
      await expectUserError(store.recordAnswer('femur', true, 5), 'validation')
    })
  })

  describe('saved views', () => {
    it('saves, updates, lists and deletes', async () => {
      const v = await store.saveView({ name: '  Ön görünüm ', scene: scene() })
      expect(v.id).toMatch(UUID_V4)
      expect(v.name).toBe('Ön görünüm')
      expect(v.scene.labels).toEqual({ enabled: true, density: 'medium' })
      const again = await store.saveView({ id: v.id, name: 'Yan görünüm', scene: { ...scene(), explode: 0.5 } })
      expect(again.createdAt).toBe(v.createdAt)
      const w = await store.saveView({ name: 'Diğer', contentVersion: 'c1', scene: scene() })
      expect((await store.listViews()).map((x) => x.id)).toEqual([w.id, v.id])
      expect((await store.listViews())[1]).toMatchObject({ name: 'Yan görünüm', scene: { explode: 0.5 } })
      await store.deleteView(v.id)
      expect((await store.listViews()).map((x) => x.id)).toEqual([w.id])
    })

    it('rejects invalid views', async () => {
      await expectUserError(store.saveView({ name: ' ', scene: scene() }), 'validation')
      await expectUserError(store.saveView({ name: 'Bozuk', scene: { ...scene(), explode: 3 } }), 'validation')
      expect(await store.listViews()).toEqual([])
    })
  })

  describe('quiz attempts and error reports', () => {
    it('stores quiz attempts', async () => {
      await store.addQuizAttempt(attempt('a1', '2026-09-01T10:00:00.000Z'))
      await store.addQuizAttempt(attempt('a2', '2026-09-02T10:00:00.000Z'))
      expect((await store.listQuizAttempts()).map((a) => a.id)).toEqual(['a2', 'a1'])
      await expectUserError(store.addQuizAttempt({ ...attempt('a3', 'dün'), mode: 'find' }), 'validation')
      expect(await store.listQuizAttempts()).toHaveLength(2)
    })

    it('stores error reports and marks them exported', async () => {
      const r = await store.addErrorReport({
        structureId: 'ax:humerus',
        category: 'label',
        description: 'Etiket yanlış yapıyı gösteriyor.',
        appVersion: '0.1.0',
        view: scene(),
      })
      expect(r).toMatchObject({ status: 'local', structureId: 'ax:humerus' })
      expect(r.id).toMatch(UUID_V4)
      await store.markReportsExported([r.id, 'unknown-id'])
      expect(await store.listErrorReports()).toEqual([{ ...r, status: 'exported' }])
      await expectUserError(
        store.addErrorReport({ category: 'label', description: '', appVersion: '0.1.0', view: scene() }),
        'validation',
      )
    })
  })

  describe('settings', () => {
    it('returns defaults, applies patches and rejects invalid values', async () => {
      expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS)
      const s = await store.setSettings({ theme: 'dark', fontScale: 1.25 })
      expect(s).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', fontScale: 1.25 })
      expect(await store.getSettings()).toEqual(s)
      await expectUserError(store.setSettings({ fontScale: 10 }), 'validation')
      await expectUserError(store.setSettings({ theme: 'neon' as never }), 'validation')
      expect(await store.getSettings()).toEqual(s)
    })
  })

  describe('export / import / delete', () => {
    async function fill(s: LocalUserDataStore) {
      const note = await s.putNote({ structureId: 'ax:humerus', text: 'Not' })
      await s.toggleFavorite('ax:humerus')
      await s.recordView('ax:humerus')
      await s.recordAnswer('ax:femur', true, 4)
      await s.saveView({ name: 'Görünüm', scene: scene() })
      await s.addQuizAttempt(attempt('a1', '2026-09-01T10:00:00.000Z'))
      await s.addErrorReport({ category: 'text', description: 'Yazım hatası', appVersion: '0.1.0', view: scene() })
      await s.setSettings({ theme: 'dark', nameLanguage: 'la' })
      return note
    }
    const withoutStamp = ({ exportedAt: _ignored, ...rest }: UserExport) => rest

    it('exports everything in the documented format', async () => {
      await fill(store)
      const data = await store.exportAll()
      expect(data.format).toBe('anatomi-3b-user-export')
      expect(data.version).toBe(1)
      expect(data.notes).toHaveLength(1)
      expect(data.favorites).toHaveLength(1)
      expect(data.progress).toHaveLength(2)
      expect(data.savedViews).toHaveLength(1)
      expect(data.quizAttempts).toHaveLength(1)
      expect(data.errorReports).toHaveLength(1)
      expect(data.settings).toMatchObject({ theme: 'dark', nameLanguage: 'la' })
      // Survives a JSON round trip (what the download/upload does).
      expect(JSON.parse(JSON.stringify(data))).toEqual(data)
    })

    it('round-trips through replace import into another store', async () => {
      await fill(store)
      const data = await store.exportAll()
      const other = createMemoryUserStore()
      await other.putNote({ text: 'Silinecek yerel not' })
      await other.toggleFavorite('ax:tibia')
      const res = await other.importAll(JSON.stringify(data), 'replace')
      expect(res.imported).toBe(7)
      expect(withoutStamp(await other.exportAll())).toEqual(withoutStamp(data))
    })

    it('replace import into the same store restores the snapshot', async () => {
      await fill(store)
      const data = await store.exportAll()
      await store.putNote({ text: 'Sonradan eklenen' })
      await store.setSettings({ theme: 'light' })
      await store.importAll(data, 'replace')
      expect(withoutStamp(await store.exportAll())).toEqual(withoutStamp(data))
    })

    it('merges by key, newest note wins, progress merged field-wise, local settings kept', async () => {
      const local = await store.putNote({ structureId: 'ax:humerus', text: 'Yerel' })
      await store.toggleFavorite('ax:humerus')
      await store.recordView('ax:humerus', new Date('2026-09-05T00:00:00.000Z'))
      await store.recordAnswer('ax:humerus', true, 5, new Date('2026-09-06T00:00:00.000Z'))
      const view = await store.saveView({ name: 'Yerel görünüm', scene: scene() })

      const backup: UserExport = {
        format: 'anatomi-3b-user-export',
        version: 1,
        exportedAt: '2026-09-20T00:00:00.000Z',
        notes: [
          { ...local, text: 'Yedekteki yeni sürüm', updatedAt: '2030-01-01T00:00:00.000Z' },
          { id: 'n-yedek', text: 'Yalnız yedekte', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
        ],
        favorites: [
          { structureId: 'ax:humerus', createdAt: '2026-01-01T00:00:00.000Z' },
          { structureId: 'ax:femur', createdAt: '2026-01-01T00:00:00.000Z' },
        ],
        progress: [
          {
            structureId: 'ax:humerus',
            viewCount: 7,
            firstViewedAt: '2026-08-01T00:00:00.000Z',
            lastViewedAt: '2026-08-02T00:00:00.000Z',
            attempts: 0,
            correct: 0,
          },
          { structureId: 'ax:tibia', viewCount: 1, attempts: 0, correct: 0 },
        ],
        savedViews: [{ ...view, name: 'Yedekteki görünüm' }],
        quizAttempts: [],
        errorReports: [],
        settings: { theme: 'dark' },
      }

      const res = await store.importAll(backup, 'merge')
      // 2 notes + 2 progress + 1 new favorite (existing favorite and view are kept).
      expect(res.imported).toBe(5)

      const notes = await store.listNotes()
      expect(notes.map((n) => n.text).sort()).toEqual(['Yalnız yedekte', 'Yedekteki yeni sürüm'])
      expect((await store.listFavorites()).map((f) => f.structureId).sort()).toEqual(['ax:femur', 'ax:humerus'])
      const humerus = await store.getProgress('ax:humerus')
      expect(humerus).toMatchObject({
        viewCount: 7,
        firstViewedAt: '2026-08-01T00:00:00.000Z',
        lastViewedAt: '2026-09-05T00:00:00.000Z',
        attempts: 1,
        correct: 1,
        lastResult: 'correct',
      })
      expect(humerus?.srs?.repetitions).toBe(1)
      expect(await store.getProgress('ax:tibia')).toMatchObject({ viewCount: 1 })
      expect((await store.listViews())[0]?.name).toBe('Yerel görünüm')
      expect((await store.getSettings()).theme).toBe('system')

      // Idempotent: importing the same file again changes nothing.
      expect((await store.importAll(backup, 'merge')).imported).toBe(0)
      // An older copy of a note does not overwrite the newer local one.
      const older = { ...backup, notes: [{ ...local, text: 'Eski', updatedAt: '2020-01-01T00:00:00.000Z' }] }
      expect((await store.importAll(older, 'merge')).imported).toBe(0)
      expect((await store.listNotes()).some((n) => n.text === 'Eski')).toBe(false)
    })

    it('rejects invalid files and leaves existing data untouched', async () => {
      await fill(store)
      const before = withoutStamp(await store.exportAll())
      await expectUserError(store.importAll('{ bozuk json', 'replace'), 'import')
      await expectUserError(store.importAll({ format: 'baska-uygulama', version: 1 }, 'replace'), 'import')
      const valid = await store.exportAll()
      const broken = { ...valid, progress: [{ ...valid.progress[0], structureId: 'femur' }] }
      const err = await expectUserError(store.importAll(broken, 'replace'), 'import')
      expect(err.issues.some((p) => p.startsWith('progress.0'))).toBe(true)
      await expectUserError(store.importAll(valid, 'overwrite' as never), 'validation')
      expect(withoutStamp(await store.exportAll())).toEqual(before)
    })

    it('ignores unknown or invalid settings in an import', async () => {
      const data = await store.exportAll()
      await store.importAll({ ...data, settings: { theme: 'dark', fontScale: 'büyük', unknown: 1 } }, 'replace')
      expect(await store.getSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
    })

    it('deleteAll removes everything including settings', async () => {
      await fill(store)
      await store.deleteAll()
      const data = await store.exportAll()
      expect(data).toMatchObject({ notes: [], favorites: [], progress: [], savedViews: [], quizAttempts: [], errorReports: [] })
      expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS)
      expect(await store.isFavorite('ax:humerus')).toBe(false)
      expect(await store.listNotes('ax:humerus')).toEqual([])
    })
  })
})

describe('openUserDb', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists data across connections', async () => {
    const name = uniqueName()
    const a = await openUserDb(name)
    await a.putNote({ structureId: 'ax:humerus', text: 'Kalıcı not' })
    await a.setSettings({ theme: 'dark' })
    a.close()
    const b = await openUserDb(name)
    expect(b.persistent).toBe(true)
    expect((await b.listNotes('ax:humerus')).map((n) => n.text)).toEqual(['Kalıcı not'])
    expect((await b.getSettings()).theme).toBe('dark')
    await b.deleteAll()
    b.close()
    const c = await openUserDb(name)
    expect(await c.listNotes()).toEqual([])
    expect(await c.getSettings()).toEqual(DEFAULT_SETTINGS)
    c.close()
  })

  it('creates the versioned schema with a structureId index on notes', async () => {
    const name = uniqueName()
    ;(await openUserDb(name)).close()
    const raw = await openDB(name)
    expect(raw.version).toBe(USER_DB_VERSION)
    expect([...raw.objectStoreNames].sort()).toEqual([...STORE_NAMES].sort())
    const tx = raw.transaction('notes')
    expect(tx.store.keyPath).toBe('id')
    expect([...tx.store.indexNames]).toEqual(['structureId'])
    expect(raw.transaction('favorites').store.keyPath).toBe('structureId')
    expect(raw.transaction('progress').store.keyPath).toBe('structureId')
    raw.close()
  })

  it('falls back to memory when IndexedDB is missing (e.g. private mode)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('indexedDB', undefined)
    const store = await openUserDb(uniqueName())
    expect(store.persistent).toBe(false)
    expect(warn).toHaveBeenCalled()
    await store.putNote({ text: 'Bellekte' })
    expect(await store.listNotes()).toHaveLength(1)
  })

  it('falls back to memory when opening throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'InvalidStateError')
      },
    })
    const store = await openUserDb(uniqueName())
    expect(store.persistent).toBe(false)
    expect(await store.toggleFavorite('ax:humerus')).toBe(true)
  })

  it('falls back to memory when opening never completes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const Request = (globalThis as unknown as { IDBOpenDBRequest: new () => IDBOpenDBRequest }).IDBOpenDBRequest
    vi.stubGlobal('indexedDB', { open: () => new Request() })
    const store = await openUserDb(uniqueName(), { timeoutMs: 20 })
    expect(store.persistent).toBe(false)
  })
})

describe('storage backends', () => {
  const backends: Array<[string, () => Promise<StorageBackend>]> = [
    ['IndexedDB', () => openIdbBackend(uniqueName())],
    ['bellek', async () => createMemoryBackend()],
  ]

  it.each(backends)('%s: a failing transaction writes nothing', async (_label, make) => {
    const backend = await make()
    await expect(
      backend.transaction(['favorites', 'notes'], 'readwrite', async (tx) => {
        await tx.put('favorites', { structureId: 'ax:humerus', createdAt: '2026-09-01' })
        await tx.clear('notes')
        throw new Error('iptal')
      }),
    ).rejects.toThrow('iptal')
    expect(await backend.getAll('favorites')).toEqual([])
    backend.close()
  })

  it('memory backend returns copies, like IndexedDB', async () => {
    const backend = createMemoryBackend()
    await backend.transaction(['favorites'], 'readwrite', (tx) =>
      tx.put('favorites', { structureId: 'ax:humerus', createdAt: '2026-09-01' }),
    )
    const [fav] = await backend.getAll('favorites')
    fav!.createdAt = 'değişti'
    expect((await backend.get('favorites', 'ax:humerus'))?.createdAt).toBe('2026-09-01')
  })
})

describe('helpers', () => {
  it('generates v4 UUIDs, also without crypto.randomUUID', () => {
    expect(newId()).toMatch(UUID_V4)
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: (b: Uint8Array<ArrayBuffer>) => real.getRandomValues(b) })
    try {
      const ids = new Set(Array.from({ length: 50 }, () => newId()))
      expect(ids.size).toBe(50)
      for (const id of ids) expect(id).toMatch(UUID_V4)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('merges progress idempotently', () => {
    const a = { structureId: 'ax:humerus', viewCount: 2, attempts: 3, correct: 1, lastAnsweredAt: '2026-09-02T00:00:00.000Z', lastResult: 'incorrect' as const }
    const b = { structureId: 'ax:humerus', viewCount: 5, attempts: 1, correct: 1, lastAnsweredAt: '2026-09-01T00:00:00.000Z', lastResult: 'correct' as const }
    const m = mergeProgress(a, b)
    expect(m).toEqual({ ...a, viewCount: 5 })
    expect(mergeProgress(m, b)).toEqual(m)
    expect(mergeProgress(b, a)).toEqual(m)
  })
})
