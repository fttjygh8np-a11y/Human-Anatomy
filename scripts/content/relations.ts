/**
 * npm run content:relations
 *
 * Imports anatomical relations between inventory structures from Wikidata statements whose
 * subject and object both carry an FMA id (P1402) present in content/structures/_inventory.
 * Every relation cites the Wikidata statement (subject, property, object) and stays
 * "unverified" until an anatomy expert checks it. Output: content/relations/wikidata.json.
 *
 * Property -> relation type (direction as in Wikidata: subject -> object):
 *   P3261 anatomical branch of -> branch_of      P2286 arterial supply   -> arterial_supply
 *   P2289 venous drainage      -> venous_drainage P2288 lymphatic drainage -> lymphatic_drainage
 *   P3189 innervated by        -> innervated_by  P3490 muscle origin     -> origin_on
 *   P3491 muscle insertion     -> insertion_on   P2789 connects with     -> articulates_with (bone-bone only)
 *
 * Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { RelationType } from '../../src/core/schema.ts'
import { CONTENT_DIR, prettyJson } from './lib/io.ts'
import { cached, sparql } from './lib/net.ts'

export const PROPERTY_TYPES: Record<string, RelationType> = {
  P3261: 'branch_of',
  P2286: 'arterial_supply',
  P2289: 'venous_drainage',
  P2288: 'lymphatic_drainage',
  P3189: 'innervated_by',
  P3490: 'origin_on',
  P3491: 'insertion_on',
  P2789: 'articulates_with',
}
const SYMMETRIC = new Set<RelationType>(['articulates_with'])

interface Statement {
  p: string
  a: string
  af: string
  b: string
  bf: string
}

interface InvStructure {
  id: string
  kind: string
  laterality: string
  externalIds: { fma?: string }
}

async function main() {
  const inventory: InvStructure[] = []
  const dir = join(CONTENT_DIR, 'structures', '_inventory')
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.json')).sort())
    inventory.push(...(JSON.parse(await readFile(join(dir, f), 'utf8')) as InvStructure[]))
  const byFma = new Map(inventory.filter((s) => s.externalIds.fma).map((s) => [s.externalIds.fma!, s]))

  const snap = await cached('wikidata-relations.json', 'https://query.wikidata.org/sparql', async () => {
    type B = { p: { value: string }; a: { value: string }; af: { value: string }; b: { value: string }; bf: { value: string } }
    const rows = await sparql<B>(
      `SELECT ?p ?a ?af ?b ?bf WHERE { VALUES ?p { ${Object.keys(PROPERTY_TYPES).map((p) => `wdt:${p}`).join(' ')} } ?a ?p ?b . ?a wdt:P1402 ?af . ?b wdt:P1402 ?bf . }`,
    )
    const data: Statement[] = rows.map((r) => ({
      p: r.p.value.split('/').pop()!,
      a: r.a.value.split('/').pop()!,
      af: r.af.value,
      b: r.b.value.split('/').pop()!,
      bf: r.bf.value,
    }))
    data.sort((x, y) => `${x.p}${x.a}${x.b}`.localeCompare(`${y.p}${y.a}${y.b}`))
    return { raw: JSON.stringify(data), data }
  })

  const out = new Map<string, Record<string, unknown>>()
  const skipped = { missing: 0, notBones: 0, self: 0 }
  for (const st of snap.data) {
    const type = PROPERTY_TYPES[st.p]
    const from = byFma.get(st.af)
    const to = byFma.get(st.bf)
    if (!type || !from || !to) {
      skipped.missing++
      continue
    }
    if (from.id === to.id) {
      skipped.self++
      continue
    }
    // "connects with" is generic; only bone-bone connections are read as articulations.
    if (st.p === 'P2789' && !(from.kind === 'bone' && to.kind === 'bone')) {
      skipped.notBones++
      continue
    }
    const [x, y] = SYMMETRIC.has(type) && from.id > to.id ? [to, from] : [from, to]
    const id = `rel:wd:${type}:${x.id.replace('fma:', '')}-${y.id.replace('fma:', '')}`
    const ref = { sourceId: 'src:wikidata', locator: `${st.a} ${st.p} ${st.b}` }
    const prev = out.get(id)
    if (prev) {
      const sources = prev.sources as { locator: string }[]
      if (!sources.some((s) => s.locator === ref.locator)) sources.push(ref)
      continue
    }
    out.set(id, {
      id,
      type,
      from: x.id,
      to: y.id,
      sources: [ref],
      verification: 'unverified',
      review: 'draft',
      provenance: 'import:wikidata',
    })
  }

  const relations = [...out.values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  const outDir = join(CONTENT_DIR, 'relations')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'wikidata.json'), prettyJson(relations))
  const byType: Record<string, number> = {}
  for (const r of relations) byType[r.type as string] = (byType[r.type as string] ?? 0) + 1
  console.log(`Wikidata (${snap.retrievedAt}): ${snap.data.length} ifade → ${relations.length} ilişki.`, byType)
  console.log(`  Atlanan: ${skipped.missing} (uç envanterde yok), ${skipped.notBones} ("connects with" kemik-kemik değil), ${skipped.self} (kendine).`)
  console.log('  Tüm ilişkiler "doğrulanmadı"; uzman incelemesi gerekir.')
}

await main()
