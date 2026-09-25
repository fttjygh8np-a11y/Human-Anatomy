/**
 * `npm run content:ta2-fma` — TA2 → FMA crosswalk from Wikidata (CC0): items with both a TA2 id
 * (P7173) and an FMA id (P1402). Written to content/terminology/ta2-fma.json (committed, so the
 * inventory build stays offline). Used to give whole muscles assembled from their heads/parts a
 * real FMA id (content:inventory). Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'
import { sparql } from './lib/net.ts'
import type { Ta2Term } from './lib/terminology.ts'

async function main(): Promise<number> {
  const ta2 = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8')) as { data: Ta2Term[] }).data
  const ids = ta2.map((t) => String(t.id))
  const map: Record<string, string[]> = {}
  for (let i = 0; i < ids.length; i += 300) {
    const vals = ids.slice(i, i + 300).map((x) => `"${x}"`).join(' ')
    for (const b of await sparql<{ ta2: { value: string }; fma: { value: string } }>(
      `SELECT ?ta2 ?fma WHERE { VALUES ?ta2 { ${vals} } ?item wdt:P7173 ?ta2 ; wdt:P1402 ?fma . }`,
    )) {
      const list = (map[b.ta2.value] ??= [])
      if (!list.includes(b.fma.value)) list.push(b.fma.value)
    }
  }
  const out = {
    source: 'src:wikidata',
    query: 'Wikidata öğeleri: P7173 (TA2 ID) ve P1402 (FMA ID)',
    url: 'https://query.wikidata.org/sparql',
    retrievedAt: new Date().toISOString().slice(0, 10),
    map: Object.fromEntries(Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))),
  }
  await writeFile(join(CONTENT_DIR, 'terminology', 'ta2-fma.json'), prettyJson(out))
  console.log(`TA2 → FMA eşlemesi: ${Object.keys(map).length} TA2 terimi (content/terminology/ta2-fma.json).`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('TA2 → FMA eşlemesi alınamadı:', e)
    process.exitCode = 1
  },
)
