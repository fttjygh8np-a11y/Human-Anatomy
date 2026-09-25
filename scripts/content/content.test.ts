/**
 * Guards the real content/** tree: it must compile without errors, and the pilot taxonomy
 * must not claim verification it does not have.
 */
import { describe, expect, it } from 'vitest'
import { SYSTEM_IDS, TOP_REGION_IDS } from '../../src/core/schema.ts'
import { summarize } from './lib/issues.ts'
import { loadContent } from './lib/pipeline.ts'

describe('content/**', async () => {
  const { content, issues } = await loadContent({ assetsPath: '/nonexistent/assets.json' })

  it('compiles and passes the integrity checks without errors', () => {
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(summarize(issues).errors).toBe(0)
  })

  it('defines every system and top-level region', () => {
    expect(content.systems.map((s) => s.id).sort()).toEqual([...SYSTEM_IDS].sort())
    for (const id of TOP_REGION_IDS) expect(content.regions.some((r) => r.id === id && !r.parentId)).toBe(true)
  })

  it('has the upper-limb pilot sub-region tree', () => {
    const children = content.regions.filter((r) => r.parentId === 'upper_limb').map((r) => r.id)
    expect(children).toEqual(expect.arrayContaining(['shoulder', 'arm', 'elbow', 'forearm', 'hand']))
    expect(content.regions.find((r) => r.id === 'wrist')?.parentId).toBe('hand')
  })

  it('does not claim verified taxonomy names or expert reviews that were not performed', () => {
    for (const t of [...content.authoredSystems, ...content.authoredRegions]) {
      expect(t.names.tr.status).toBe('unverified')
      expect(t.names.en.status).toBe('unverified')
      if (t.names.la) expect(t.names.la.status).toBe('unverified')
      for (const e of [t.names.en, t.names.la].filter((x) => x !== undefined)) expect(e.sources.length).toBeGreaterThan(0)
    }
    expect(content.reviews).toEqual([])
    // A license may only be marked verified with the page read, the date and a quoted excerpt.
    for (const s of content.sources) {
      const v = s.license.verifiedAt
      if (v) expect(v.quote?.length ?? 0).toBeGreaterThan(40)
    }
  })
})
