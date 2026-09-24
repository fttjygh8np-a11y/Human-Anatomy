import { describe, expect, it, vi } from 'vitest'
import { ContentLoadError, joinUrl, loadContentBundle } from './loader.ts'
import { DATA_FILES } from './types.ts'

const now = '2026-09-24'

function validFiles(): Record<string, unknown> {
  return {
    [DATA_FILES.manifest]: {
      schemaVersion: 1,
      contentVersion: 'abc123',
      generatedAt: `${now}T00:00:00.000Z`,
      counts: { structures: 1, relations: 0, sources: 1, lessons: 0, questions: 0, reviews: 0, scope: 0, assets: 0 },
      files: {},
    },
    [DATA_FILES.taxonomy]: {
      systems: [{ id: 'skeletal', name: { tr: 'İskelet', en: 'Skeletal' }, color: '#aabbcc', layerOrder: 0 }],
      regions: [{ id: 'upper_limb', name: { tr: 'Üst', en: 'Upper' }, order: 0 }],
    },
    [DATA_FILES.structures]: [
      {
        id: 'ax:test',
        schemaVersion: 1,
        kind: 'bone',
        names: { en: { value: 'test', status: 'unverified' } },
        systems: ['skeletal'],
        laterality: 'not_applicable',
        detailLevel: 'basic',
        provenance: { createdBy: 'author:human', createdAt: now, updatedAt: now },
      },
    ],
    [DATA_FILES.relations]: [],
    [DATA_FILES.sources]: [
      {
        id: 'src:test',
        type: 'textbook',
        citation: 'Test',
        shortLabel: 'Test',
        license: { id: 'CC0-1.0', allowsUse: true, allowsModification: true, allowsRedistribution: true },
      },
    ],
    [DATA_FILES.assets]: [],
    [DATA_FILES.lessons]: [],
    [DATA_FILES.questions]: [],
    [DATA_FILES.reviews]: [],
    [DATA_FILES.scope]: [],
  }
}

type Reply = unknown | { status: number } | { raw: string } | Error

function mockFetch(files: Record<string, Reply>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const key = Object.keys(files).find((k) => url.endsWith(k))
    const reply = key !== undefined ? files[key] : { status: 404 }
    if (reply instanceof Error) throw reply
    if (reply && typeof reply === 'object' && 'status' in reply && typeof reply.status === 'number' && Object.keys(reply).length === 1)
      return new Response('error', { status: reply.status })
    if (reply && typeof reply === 'object' && 'raw' in reply) return new Response(String(reply.raw), { status: 200 })
    return new Response(JSON.stringify(reply), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

async function loadError(files: Record<string, Reply>): Promise<ContentLoadError> {
  try {
    await loadContentBundle('./', mockFetch(files))
  } catch (e) {
    expect(e).toBeInstanceOf(ContentLoadError)
    return e as ContentLoadError
  }
  throw new Error('expected loadContentBundle to fail')
}

describe('joinUrl', () => {
  it('joins bases with and without trailing slash', () => {
    expect(joinUrl('./', 'data/a.json')).toBe('./data/a.json')
    expect(joinUrl('https://host/app', 'data/a.json')).toBe('https://host/app/data/a.json')
    expect(joinUrl('', 'data/a.json')).toBe('data/a.json')
  })
})

describe('loadContentBundle', () => {
  it('fetches every data file in parallel and returns a validated bundle', async () => {
    const f = mockFetch(validFiles())
    const bundle = await loadContentBundle('https://host/app/', f)
    expect(f).toHaveBeenCalledTimes(Object.keys(DATA_FILES).length)
    expect(f.mock.calls.map((c: unknown[]) => String(c[0])).sort()).toEqual(Object.values(DATA_FILES).map((p) => `https://host/app/${p}`).sort())
    expect(bundle.manifest.contentVersion).toBe('abc123')
    expect(bundle.systems).toHaveLength(1)
    expect(bundle.regions).toHaveLength(1)
    // zod defaults are applied
    expect(bundle.structures[0]!.review).toEqual({ text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' })
    expect(bundle.structures[0]!.names.en.sources).toEqual([])
  })

  it('accepts assets.json wrapped as { assets: [...] }', async () => {
    const files = validFiles()
    files[DATA_FILES.assets] = { assets: [] }
    const bundle = await loadContentBundle('./', mockFetch(files))
    expect(bundle.assets).toEqual([])
  })

  it('reports missing files in Turkish and marks 404 as not retryable', async () => {
    const files = validFiles()
    delete files[DATA_FILES.structures]
    const err = await loadError(files)
    expect(err.retryable).toBe(false)
    expect(err.problems).toEqual([expect.objectContaining({ file: DATA_FILES.structures, kind: 'http', status: 404 })])
    expect(err.message).toContain('Anatomi içeriği yüklenemedi')
    expect(err.message).toContain('content:build')
  })

  it('marks server and network failures as retryable and lists every failed file', async () => {
    const files = validFiles()
    files[DATA_FILES.relations] = { status: 503 }
    files[DATA_FILES.lessons] = new TypeError('Failed to fetch')
    const err = await loadError(files)
    expect(err.retryable).toBe(true)
    expect(err.problems.map((p) => p.kind).sort()).toEqual(['http', 'network'])
    expect(err.message).toContain('2 dosyada sorun var')
  })

  it('rejects invalid JSON and schema violations with Turkish messages', async () => {
    const files = validFiles()
    files[DATA_FILES.questions] = { raw: '{not json' }
    files[DATA_FILES.sources] = [{ id: 'bad-id' }]
    const err = await loadError(files)
    const byFile = Object.fromEntries(err.problems.map((p) => [p.file, p]))
    expect(byFile[DATA_FILES.questions]!.kind).toBe('json')
    expect(byFile[DATA_FILES.sources]!.kind).toBe('schema')
    expect(byFile[DATA_FILES.sources]!.message).toMatch(/içerik biçimi geçersiz — \[0\]\.id: Geçersiz/)
    expect(err.retryable).toBe(false)
  })

  it('detects files from different content versions via manifest counts', async () => {
    const files = validFiles()
    files[DATA_FILES.structures] = []
    const err = await loadError(files)
    expect(err.problems[0]).toMatchObject({ file: DATA_FILES.structures, kind: 'version' })
    expect(err.retryable).toBe(true)
  })
})
