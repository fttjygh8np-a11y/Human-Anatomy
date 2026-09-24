import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { downloadWithResume, fetchChecked, parseDirectoryListing, SourceUnavailableError, unzipFile } from './lib/download.ts'
import { sha256 } from './lib/util.ts'

const PAYLOAD = Buffer.from(Array.from({ length: 50_000 }, (_, i) => (i * 7) % 251))
const rangeRequests: string[] = []

function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === '/blocked') {
    res.writeHead(403, { 'content-type': 'text/plain', 'x-deny-reason': 'host_not_allowed' })
    res.end('Host not in allowlist')
    return
  }
  if (req.url === '/norange') {
    res.writeHead(200, { 'content-length': String(PAYLOAD.length) })
    res.end(PAYLOAD)
    return
  }
  const range = req.headers.range
  if (range) {
    rangeRequests.push(range)
    const start = Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0)
    if (start >= PAYLOAD.length) {
      res.writeHead(416, { 'content-range': `bytes */${PAYLOAD.length}` })
      res.end()
      return
    }
    res.writeHead(206, {
      'content-range': `bytes ${start}-${PAYLOAD.length - 1}/${PAYLOAD.length}`,
      'content-length': String(PAYLOAD.length - start),
      etag: '"v1"',
    })
    res.end(PAYLOAD.subarray(start))
    return
  }
  res.writeHead(200, { 'content-length': String(PAYLOAD.length), etag: '"v1"' })
  res.end(PAYLOAD)
}

let server: Server
let base = ''
let dir = ''

beforeAll(async () => {
  server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  dir = mkdtempSync(join(tmpdir(), 'bp3d-dl-'))
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(dir, { recursive: true, force: true })
})

describe('parseDirectoryListing', () => {
  it('extracts same-directory file links and ignores sort links, parents and sub-directories', () => {
    const html = `<html><body><h1>Index of /data/bodyparts3d/LATEST</h1>
      <a href="?C=N;O=D">Name</a> <a href="/data/bodyparts3d/">Parent Directory</a>
      <a href="isa_BP3D_4.0_obj_99.zip">isa_BP3D_4.0_obj_99.zip</a>
      <a href='partof_inclusion_relation_list.txt'>x</a>
      <a href="sub/">sub/</a> <a href="https://example.org/other.zip">ext</a>
      <a href="isa_element%20parts.txt">y</a></body></html>`
    const entries = parseDirectoryListing(html, 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/')
    expect(entries.map((e) => e.name)).toEqual(['isa_BP3D_4.0_obj_99.zip', 'isa_element parts.txt', 'partof_inclusion_relation_list.txt'])
    expect(entries[0]!.url).toBe('https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip')
  })
})

describe('fetchChecked', () => {
  it('turns an HTTP 403 from a proxy into a Turkish explanation with the offline alternative', async () => {
    const err = await fetchChecked(`${base}/blocked`, {}, '/tmp/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SourceUnavailableError)
    const e = err as SourceUnavailableError
    expect(e.status).toBe(403)
    expect(e.message).toContain('erişilemedi')
    expect(e.message).toContain('host_not_allowed')
    expect(e.message).toContain('--offline')
  })

  it('explains network failures (e.g. a refused CONNECT tunnel)', async () => {
    const failing = () => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { message: 'Proxy response (403) !== 200 when HTTP Tunneling' } }))
    const err = (await fetchChecked('https://dbarchive.biosciencedbc.jp/x', {}, '/tmp/x', failing).catch((e: unknown) => e)) as SourceUnavailableError
    expect(err).toBeInstanceOf(SourceUnavailableError)
    expect(err.status).toBe(403)
    expect(err.message).toContain('dbarchive.biosciencedbc.jp')
  })
})

describe('downloadWithResume', () => {
  it('downloads a file and records its sha256', async () => {
    const dest = join(dir, 'fresh.bin')
    const r = await downloadWithResume(`${base}/file`, dest, { destDir: dir })
    expect(r.bytes).toBe(PAYLOAD.length)
    expect(r.sha256).toBe(sha256(PAYLOAD))
    expect(r.resumedFrom).toBe(0)
    expect(r.etag).toBe('"v1"')
  })

  it('resumes from a partial .part file with an HTTP Range request', async () => {
    const dest = join(dir, 'resumed.bin')
    writeFileSync(`${dest}.part`, PAYLOAD.subarray(0, 12_345))
    rangeRequests.length = 0
    const r = await downloadWithResume(`${base}/file`, dest, { destDir: dir })
    expect(rangeRequests).toEqual(['bytes=12345-'])
    expect(r.resumedFrom).toBe(12_345)
    expect(sha256(readFileSync(dest))).toBe(sha256(PAYLOAD))
    expect(existsSync(`${dest}.part`)).toBe(false)
  })

  it('treats 416 on a complete file as done', async () => {
    const dest = join(dir, 'complete.bin')
    writeFileSync(dest, PAYLOAD)
    const r = await downloadWithResume(`${base}/file`, dest, { destDir: dir })
    expect(r.bytes).toBe(PAYLOAD.length)
    expect(r.sha256).toBe(sha256(PAYLOAD))
  })

  it('restarts from zero when the server ignores the Range header', async () => {
    const dest = join(dir, 'norange.bin')
    writeFileSync(`${dest}.part`, Buffer.from('garbage'))
    const r = await downloadWithResume(`${base}/norange`, dest, { destDir: dir })
    expect(r.sha256).toBe(sha256(PAYLOAD))
  })
})

describe('unzipFile', () => {
  it('streams entries into the target directory', async () => {
    const zip = zipSync({ 'isa_BP3D_4.0_obj_99/FJ1.obj': strToU8('v 0 0 0\n'.repeat(1000)), 'isa_BP3D_4.0_obj_99/FJ2.obj': strToU8('# x\n') })
    const zipPath = join(dir, 'a.zip')
    writeFileSync(zipPath, zip)
    const out = join(dir, 'unzipped')
    const r = await unzipFile(zipPath, out)
    expect(r.files).toBe(2)
    expect(readFileSync(join(out, 'isa_BP3D_4.0_obj_99', 'FJ1.obj'), 'utf8')).toBe('v 0 0 0\n'.repeat(1000))
  })

  it('rejects entries that would escape the target directory', async () => {
    const zip = zipSync({ '../evil.txt': strToU8('x') })
    const zipPath = join(dir, 'evil.zip')
    writeFileSync(zipPath, zip)
    await expect(unzipFile(zipPath, join(dir, 'safe'))).rejects.toThrow(/Güvensiz/)
    expect(existsSync(join(dir, 'evil.txt'))).toBe(false)
  })
})
