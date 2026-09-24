import { describe, expect, it } from 'vitest'
import {
  AssetLoadError,
  describeLoadError,
  fetchAssetBuffer,
  isRetryableStatus,
  resourcePathOf,
  sha256Hex,
  verifySha256,
} from './fetchAsset.ts'

const bytes = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => i % 251))

function streamResponse(chunks: Uint8Array[], init: ResponseInit & { length?: number } = {}): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c)
      controller.close()
    },
  })
  const headers = new Headers(init.headers)
  if (init.length !== undefined) headers.set('content-length', String(init.length))
  return new Response(body, { ...init, headers })
}

describe('fetchAssetBuffer', () => {
  it('concatenates streamed chunks and reports progress', async () => {
    const progress: Array<[number, number | null]> = []
    const buf = await fetchAssetBuffer('models/x.glb', {
      fetchImpl: async () => streamResponse([bytes(10), bytes(5)], { length: 15 }),
      onProgress: (l, t) => progress.push([l, t]),
    })
    expect(buf.byteLength).toBe(15)
    expect(progress.at(-1)).toEqual([15, 15])
    expect(progress[0]).toEqual([0, 15])
  })

  it('prefers the catalogue size and drops a total that is exceeded', async () => {
    const progress: Array<[number, number | null]> = []
    await fetchAssetBuffer('x', {
      expectedBytes: 4,
      fetchImpl: async () => streamResponse([bytes(3), bytes(3)]),
      onProgress: (l, t) => progress.push([l, t]),
    })
    expect(progress[1]).toEqual([3, 4])
    expect(progress.at(-1)).toEqual([6, null])
  })

  it('classifies HTTP errors', async () => {
    await expect(fetchAssetBuffer('x', { fetchImpl: async () => new Response('', { status: 404 }) })).rejects.toMatchObject({
      retryable: false,
      status: 404,
    })
    await expect(fetchAssetBuffer('x', { fetchImpl: async () => new Response('', { status: 503 }) })).rejects.toMatchObject({
      retryable: true,
    })
  })

  it('classifies network failures as retryable and passes aborts through', async () => {
    await expect(
      fetchAssetBuffer('x', {
        fetchImpl: async () => {
          throw new TypeError('Failed to fetch')
        },
      }),
    ).rejects.toBeInstanceOf(AssetLoadError)
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(
      fetchAssetBuffer('x', {
        signal: ctrl.signal,
        fetchImpl: async () => {
          throw new DOMException('aborted', 'AbortError')
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('integrity and errors', () => {
  it('verifies sha256', async () => {
    const data = new TextEncoder().encode('abc')
    const hex = await sha256Hex(data.buffer as ArrayBuffer)
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    await expect(verifySha256(data.buffer as ArrayBuffer, hex!.toUpperCase())).resolves.toBeUndefined()
    await expect(verifySha256(data.buffer as ArrayBuffer, '00')).rejects.toBeInstanceOf(AssetLoadError)
  })

  it('retries only transient statuses', () => {
    expect([0, 408, 429, 500, 503].every(isRetryableStatus)).toBe(true)
    expect([400, 403, 404].some(isRetryableStatus)).toBe(false)
  })

  it('describes unknown errors as non-retryable', () => {
    expect(describeLoadError(new Error('bad magic'))).toEqual({ message: 'Model dosyası okunamadı: bad magic', retryable: false })
    expect(describeLoadError(new AssetLoadError('x', true))).toEqual({ message: 'x', retryable: true })
  })

  it('derives the resource path of a URL', () => {
    expect(resourcePathOf('./models/dev/a.glb?v=1')).toBe('./models/dev/')
    expect(resourcePathOf('a.glb')).toBe('')
  })
})
