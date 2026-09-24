import { describe, expect, it } from 'vitest'
import { contentManifestSchema } from '../../../src/core/schema.ts'
import { DATA_FILE_SCHEMAS } from '../../../src/data/loader.ts'
import { buildManifest, buildTimestamp, contentOutputs, contentVersionOf, sha256 } from './manifest.ts'
import { compileWith } from './test-helpers.ts'

describe('manifest', () => {
  it('derives a stable content version from the inputs', () => {
    const a = [
      { path: 'content/a.json', text: '[1]' },
      { path: 'content/b.json', text: '[2]' },
    ]
    const v = contentVersionOf(a)
    expect(v).toMatch(/^[0-9a-f]{16}$/)
    expect(contentVersionOf([...a].reverse())).toBe(v)
    expect(contentVersionOf([{ path: 'content/a.json', text: '[3]' }, a[1]!])).not.toBe(v)
    expect(contentVersionOf([])).toMatch(/^[0-9a-f]{16}$/)
  })

  it('uses SOURCE_DATE_EPOCH when given', () => {
    expect(buildTimestamp({ SOURCE_DATE_EPOCH: '0' })).toBe('1970-01-01T00:00:00.000Z')
    expect(buildTimestamp({})).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('builds outputs and a manifest that pass the loader schemas', () => {
    const { content } = compileWith()
    const outputs = contentOutputs(content)
    const texts: Record<string, string> = { assets: '[]' }
    for (const [k, v] of Object.entries(outputs)) texts[k] = JSON.stringify(v)
    const manifest = buildManifest({ content, contentVersion: 'abc', generatedAt: '2026-09-24T00:00:00Z', fileTexts: texts })
    expect(contentManifestSchema.safeParse(manifest).success).toBe(true)
    expect(manifest.counts).toMatchObject({ systems: 1, regions: 2, structures: 0, sources: 3, assets: 0 })
    expect(manifest.files.structures).toBe(`sha256:${sha256('[]')}`)
    for (const [k, text] of Object.entries(texts)) {
      expect(DATA_FILE_SCHEMAS[k as keyof typeof DATA_FILE_SCHEMAS].safeParse(JSON.parse(text)).success).toBe(true)
    }
  })
})
