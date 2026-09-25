/**
 * npm run content:terms
 *
 * Adds sourced Latin (TA2) and, where confirmed, Turkish (TDK) names to inventory structures
 * (including the generic concepts created by content:inventory). Network snapshots are cached in
 * vendor/terminology/ (gitignored) with URL, date and sha256; re-runs use the cache unless
 * --refresh is given. Output: content/structures/terminoloji/adlar.json (generated overlay).
 *
 * Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { cached, get, sparql, type Cached } from './lib/net.ts'
import { join } from 'node:path'
import vm from 'node:vm'
import {
  buildOverlay,
  indexTa2,
  matchTa2,
  normalizeEn,
  type Ta2Term,
  type WikidataTr,
  usableTrLabel,
  wikidataTrName,
  type TdkEvidence,
} from './lib/terminology.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'

const TA2_VIEWER = 'https://ta2viewer.openanatomy.org/'
const today = new Date().toISOString().slice(0, 10)

/** TA2 term list embedded in the OpenAnatomy TA2 Viewer bundle (a JSON.parse('…') string literal). */
async function loadTa2(): Promise<Cached<Ta2Term[]>> {
  return cached('ta2.json', TA2_VIEWER, async () => {
    const html = await get(TA2_VIEWER)
    const main = /src="(\/static\/js\/main\.[0-9a-f]+\.chunk\.js)"/.exec(html)?.[1]
    if (!main) throw new Error('TA2 Viewer ana betiği bulunamadı')
    const js = await get(new URL(main, TA2_VIEWER).href)
    const marker = /e\.exports=JSON\.parse\((')\[\{"level":"/g
    const m = marker.exec(js)
    if (!m) throw new Error('TA2 terim listesi betikte bulunamadı')
    const start = m.index + 'e.exports=JSON.parse('.length
    const end = js.indexOf("')", start) + 1
    const literal = js.slice(start, end)
    if (!/^'[^]*'$/.test(literal)) throw new Error('TA2 terim listesi beklenen biçimde değil')
    const text = vm.runInNewContext(literal, {}, { timeout: 5000 }) as string
    const data = (JSON.parse(text) as Ta2Term[]).map((t) => ({ id: t.id, term: t.term, synonyms: t.synonyms, parent: t.parent }))
    return { raw: js, data }
  })
}

/** FMA id -> TA2 ids, and TA2 id -> FMA ids, from Wikidata. */
async function loadWikidata(fmas: string[], ta2Ids: number[]) {
  return cached('wikidata.json', 'https://query.wikidata.org/sparql', async () => {
    const fmaToTa2: Record<string, string[]> = {}
    const ta2ToFma: Record<string, string[]> = {}
    type B = { fma: { value: string }; ta2?: { value: string } }
    const push = (m: Record<string, string[]>, k: string, v: string) => {
      const list = (m[k] ??= [])
      if (!list.includes(v)) list.push(v)
    }
    for (let i = 0; i < fmas.length; i += 300) {
      const vals = fmas.slice(i, i + 300).map((x) => `"${x}"`).join(' ')
      for (const b of await sparql<B>(`SELECT ?fma ?ta2 WHERE { VALUES ?fma { ${vals} } ?item wdt:P1402 ?fma . OPTIONAL { ?item wdt:P7173 ?ta2 } }`))
        if (b.ta2) push(fmaToTa2, b.fma.value, b.ta2.value)
    }
    for (let i = 0; i < ta2Ids.length; i += 300) {
      const vals = ta2Ids.slice(i, i + 300).map((x) => `"${x}"`).join(' ')
      for (const b of await sparql<{ fma: { value: string }; ta2: { value: string } }>(
        `SELECT ?fma ?ta2 WHERE { VALUES ?ta2 { ${vals} } ?item wdt:P7173 ?ta2 ; wdt:P1402 ?fma . }`,
      ))
        push(ta2ToFma, b.ta2.value, b.fma.value)
    }
    const data = { fmaToTa2, ta2ToFma }
    return { raw: JSON.stringify(data), data }
  })
}

interface TdkSense {
  anlam: string
  ozelliklerListe?: { tam_adi: string }[]
}
interface TdkEntry {
  madde: string
  madde_id: string
  anlamlarListe?: TdkSense[]
}

/** TDK Güncel Türkçe Sözlük lookups; the cache grows incrementally (only new words are fetched). */
async function loadTdk(words: string[]) {
  const file = join(REPO_ROOT, 'vendor', 'terminology', 'tdk.json')
  let entry: Cached<Record<string, TdkEntry[] | null>>
  try {
    entry = JSON.parse(await readFile(file, 'utf8')) as Cached<Record<string, TdkEntry[] | null>>
  } catch {
    entry = { url: 'https://sozluk.gov.tr/gts', retrievedAt: today, sha256: '', data: {} }
  }
  const missing = words.filter((w) => !(w in entry.data))
  for (const w of missing) {
    const text = await get(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(w)}`, 'application/json')
    const j = JSON.parse(text) as TdkEntry[] | { error: string }
    entry.data[w] = Array.isArray(j) ? j : null
    await new Promise((r) => setTimeout(r, 150))
  }
  if (missing.length > 0) {
    entry.retrievedAt = today
    entry.sha256 = createHash('sha256').update(JSON.stringify(entry.data)).digest('hex')
    await mkdir(join(REPO_ROOT, 'vendor', 'terminology'), { recursive: true })
    await writeFile(file, JSON.stringify(entry))
  }
  return entry
}

/** Turkish labels and Turkish Wikipedia titles of Wikidata items with the given FMA ids. */
async function loadWikidataTr(fmas: string[]) {
  return cached('wikidata-tr.json', 'https://query.wikidata.org/sparql', async () => {
    const data: Record<string, { item: string; label?: string; trwiki?: string }> = {}
    type B = { fma: { value: string }; item: { value: string }; label?: { value: string }; title?: { value: string } }
    for (let i = 0; i < fmas.length; i += 80) {
      const vals = fmas.slice(i, i + 80).map((x) => `"${x}"`).join(' ')
      const rows = await sparql<B>(
        `SELECT ?fma ?item ?label ?title WHERE { VALUES ?fma { ${vals} } ?item wdt:P1402 ?fma .
         OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "tr") }
         OPTIONAL { ?art schema:about ?item ; schema:isPartOf <https://tr.wikipedia.org/> ; schema:name ?title } }`,
      )
      for (const r of rows) {
        if (data[r.fma.value]) continue
        data[r.fma.value] = {
          item: r.item.value.split('/').pop()!,
          ...(r.label ? { label: r.label.value } : {}),
          ...(r.title ? { trwiki: r.title.value } : {}),
        }
      }
    }
    return { raw: JSON.stringify(data), data }
  })
}

function tdkEvidence(word: string, entries: TdkEntry[] | null | undefined): TdkEvidence | undefined {
  for (const e of entries ?? []) {
    if (e.madde.toLocaleLowerCase('tr') !== word.toLocaleLowerCase('tr')) continue
    const sense = e.anlamlarListe?.find((a) => a.ozelliklerListe?.some((o) => o.tam_adi === 'anatomi' || o.tam_adi === 'tıp'))
    if (sense) return { madde: e.madde, maddeId: String(e.madde_id), definition: sense.anlam }
  }
  return undefined
}

async function readJsonArrays(dir: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.json')).sort())
    out.push(...(JSON.parse(await readFile(join(dir, f), 'utf8')) as Record<string, unknown>[]))
  return out
}

type Structure = Parameters<typeof matchTa2>[0] & { regions: string[]; systems: string[]; counterpartId?: string; genericId?: string }

async function main() {
  const inventory = (await readJsonArrays(join(CONTENT_DIR, 'structures', '_inventory'))) as unknown as Structure[]
  const candidates = (JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'tr-adaylari.json'), 'utf8')) as { adaylar: Record<string, string[]> }).adaylar

  const ta2 = await loadTa2()
  const idx = indexTa2(ta2.data)
  console.log(`TA2: ${ta2.data.length} terim (${ta2.url}, ${ta2.retrievedAt})`)

  // TA2 ids of Turkish candidates and of scope targets.
  const ta2ForEnExact = (en: string) => {
    const hit = idx.byEn.get(normalizeEn(en))
    return hit && hit.size === 1 ? [...hit][0]! : undefined
  }
  // Candidate keys may omit the "muscle"/"bone" head noun TA2 uses ("deltoid" -> "deltoid muscle").
  const ta2ForEn = (en: string) => ta2ForEnExact(en) ?? ta2ForEnExact(`${en} muscle`) ?? ta2ForEnExact(`${en} bone`)
  const fmas = inventory.map((s) => s.externalIds.fma).filter((x): x is string => !!x)
  const wd = await loadWikidata(fmas, [])
  const fmaToTa2 = new Map(Object.entries(wd.data.fmaToTa2))

  // Turkish names confirmed in TDK, keyed by TA2 id.
  const words = [...new Set(Object.values(candidates).flat())]
  const tdk = await loadTdk(words)
  const trByTa2 = new Map<number, TdkEvidence>()
  for (const [en, list] of Object.entries(candidates)) {
    const id = ta2ForEn(en)
    if (id === undefined) {
      console.warn(`  ! Aday anahtarı TA2'de tekil eşleşmedi: "${en}"`)
      continue
    }
    for (const w of list) {
      const ev = tdkEvidence(w, tdk.data[w])
      if (ev) {
        trByTa2.set(id, ev)
        break
      }
    }
  }
  console.log(`TDK: ${trByTa2.size}/${Object.keys(candidates).length} aday terim sözlükte anatomi/tıp anlamıyla bulundu.`)

  // Second tier: Wikidata Turkish labels (community-edited), only where TDK has no entry.
  const wdTr = await loadWikidataTr(fmas)
  const byId = new Map(inventory.map((s) => [s.id, s]))
  const wikidataTr = (s: Structure): WikidataTr | undefined => {
    const own = s.externalIds.fma ? wdTr.data[s.externalIds.fma] : undefined
    if (own?.label && usableTrLabel(own.label, s.names.en.value)) return { ...own, label: own.label, composed: false }
    const generic = s.genericId ? byId.get(s.genericId) : undefined
    const g = generic?.externalIds.fma ? wdTr.data[generic.externalIds.fma] : undefined
    if (generic && g?.label && usableTrLabel(g.label, generic.names.en.value) && (s.laterality === 'right' || s.laterality === 'left'))
      return { ...g, label: g.label, composed: true }
    return undefined
  }

  // Overlays for inventory structures.
  const overlays: Record<string, unknown>[] = []
  const matched = new Map<string, number>()
  let trCount = 0
  let wdCount = 0
  const excluded = (JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'ta2-dislama.json'), 'utf8')) as { yapilar: Record<string, string> }).yapilar
  for (const s of inventory) {
    const m = s.id in excluded ? null : matchTa2(s, idx, fmaToTa2)
    const tdkTr = m ? trByTa2.get(m.term.id) : undefined
    const o: Record<string, unknown> | undefined = m ? buildOverlay(s, m, tdkTr, { ta2Url: ta2.url, date: ta2.retrievedAt }) : undefined
    if (m) matched.set(s.id, m.term.id)
    if (tdkTr) trCount++
    const wd = tdkTr ? undefined : wikidataTr(s)
    if (wd) wdCount++
    if (!o && !wd) continue
    const overlay = o ?? { id: s.id, names: {} }
    if (wd) (overlay.names as Record<string, unknown>).tr = wikidataTrName(s, wd)
    overlays.push(overlay)
  }

  const overlayById = new Map(overlays.map((o) => [o.id as string, o]))
  const out = [...overlayById.values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  const outDir = join(CONTENT_DIR, 'structures', 'terminoloji')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'adlar.json'), prettyJson(out))
  console.log(
    `${matched.size}/${inventory.length} yapıya TA2 Latince adı, ${trCount} yapıya TDK, ${wdCount} yapıya Wikidata Türkçe adı eklendi.\n` +
      'Tüm adlar "doğrulanmadı" durumundadır; uzman incelemesi gerekir (docs/uzman-inceleme.md).',
  )
}

await main()
