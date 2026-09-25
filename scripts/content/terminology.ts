/**
 * npm run content:terms
 *
 * Adds sourced Latin (TA2) and, where confirmed, Turkish (TDK) names to inventory structures
 * and creates generic records for scope targets. Network snapshots are cached in
 * vendor/terminology/ (gitignored) with URL, date and sha256; re-runs use the cache unless
 * --refresh is given. Output: content/structures/terminoloji/adlar.json (generated overlay)
 * and structureId links in content/scope/*.json.
 *
 * Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import vm from 'node:vm'
import {
  TA2_SOURCE,
  TDK_SOURCE,
  buildOverlay,
  capitalizeTr,
  indexTa2,
  matchTa2,
  normalizeEn,
  type Ta2Term,
  type TdkEvidence,
} from './lib/terminology.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'

const CACHE = join(REPO_ROOT, 'vendor', 'terminology')
const TA2_VIEWER = 'https://ta2viewer.openanatomy.org/'
const UA = 'anatomi-3b/0.1 (egitim projesi; https://github.com/fttjygh8np-a11y/human-anatomy)'
const refresh = process.argv.includes('--refresh')
const today = new Date().toISOString().slice(0, 10)

interface Cached<T> {
  url: string
  retrievedAt: string
  sha256: string
  data: T
}

async function cached<T>(name: string, url: string, load: () => Promise<{ raw: string; data: T }>): Promise<Cached<T>> {
  const file = join(CACHE, name)
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as Cached<T>
    } catch {
      // not cached yet
    }
  }
  const { raw, data } = await load()
  const entry: Cached<T> = { url, retrievedAt: today, sha256: createHash('sha256').update(raw).digest('hex'), data }
  await mkdir(CACHE, { recursive: true })
  await writeFile(file, JSON.stringify(entry))
  return entry
}

async function get(url: string, accept = '*/*'): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.text()
}

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

async function sparql<T>(query: string): Promise<T[]> {
  const text = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, 'application/sparql-results+json')
  return (JSON.parse(text) as { results: { bindings: T[] } }).results.bindings
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

async function loadTdk(words: string[]) {
  return cached('tdk.json', 'https://sozluk.gov.tr/gts', async () => {
    const data: Record<string, TdkEntry[] | null> = {}
    for (const w of words) {
      const text = await get(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(w)}`, 'application/json')
      const j = JSON.parse(text) as TdkEntry[] | { error: string }
      data[w] = Array.isArray(j) ? j : null
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

type Structure = Parameters<typeof matchTa2>[0] & { regions: string[]; systems: string[]; counterpartId?: string }

async function main() {
  const inventory = (await readJsonArrays(join(CONTENT_DIR, 'structures', '_inventory'))) as unknown as Structure[]
  const candidates = (JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'tr-adaylari.json'), 'utf8')) as { adaylar: Record<string, string[]> }).adaylar

  const ta2 = await loadTa2()
  const idx = indexTa2(ta2.data)
  console.log(`TA2: ${ta2.data.length} terim (${ta2.url}, ${ta2.retrievedAt})`)

  // TA2 ids of Turkish candidates and of scope targets.
  const ta2ForEn = (en: string) => {
    const hit = idx.byEn.get(normalizeEn(en))
    return hit && hit.size === 1 ? [...hit][0]! : undefined
  }
  const scopeDir = join(CONTENT_DIR, 'scope')
  const scopeFiles = (await readdir(scopeDir)).filter((f) => f.endsWith('.json')).sort()
  const scope: { file: string; targets: Record<string, unknown>[] }[] = []
  for (const f of scopeFiles) scope.push({ file: f, targets: JSON.parse(await readFile(join(scopeDir, f), 'utf8')) })
  const scopeTa2 = new Map<string, number>()
  for (const { targets } of scope)
    for (const t of targets) {
      const en = (t.name as { en: string }).en
      const id = ta2ForEn(en) ?? ta2ForEn(`${en} bone`)
      if (id !== undefined) scopeTa2.set(t.id as string, id)
    }

  const fmas = inventory.map((s) => s.externalIds.fma).filter((x): x is string => !!x)
  const wd = await loadWikidata(fmas, [...new Set(scopeTa2.values())])
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

  // Overlays for inventory structures.
  const overlays: Record<string, unknown>[] = []
  const matched = new Map<string, number>()
  let trCount = 0
  for (const s of inventory) {
    const m = matchTa2(s, idx, fmaToTa2)
    if (!m) continue
    matched.set(s.id, m.term.id)
    const tr = trByTa2.get(m.term.id)
    if (tr) trCount++
    overlays.push(buildOverlay(s, m, tr, { ta2Url: ta2.url, date: ta2.retrievedAt }))
  }

  // Generic records for scope targets, linked to their sided instances.
  const overlayById = new Map(overlays.map((o) => [o.id as string, o]))
  let linked = 0
  for (const { file, targets } of scope) {
    let changed = false
    for (const t of targets) {
      const ta2Id = scopeTa2.get(t.id as string)
      if (ta2Id === undefined) {
        console.warn(`  ! Kapsam hedefi TA2'de bulunamadı: ${t.id as string}`)
        continue
      }
      const fmaIds = wd.data.ta2ToFma[String(ta2Id)] ?? []
      if (fmaIds.length !== 1) {
        console.warn(`  ! ${t.id as string}: TA2 ${ta2Id} için Wikidata'da ${fmaIds.length} FMA kimliği var; genel kayıt oluşturulmadı.`)
        continue
      }
      const genericId = `fma:${fmaIds[0]}`
      const instances = inventory.filter((s) => matched.get(s.id) === ta2Id && (s.laterality === 'right' || s.laterality === 'left'))
      if (instances.length === 0) continue
      const term = idx.byId.get(ta2Id)!
      const tr = trByTa2.get(ta2Id)
      const first = instances[0]!
      const generic: Record<string, unknown> = {
        id: genericId,
        schemaVersion: 1,
        kind: t.kind,
        names: {
          en: { value: capitalizeTr(term.term.en ?? (t.name as { en: string }).en), status: 'unverified', sources: [{ sourceId: TA2_SOURCE, locator: `TA2 ID ${ta2Id}` }] },
          la: { value: term.term.la, status: 'unverified', sources: [{ sourceId: TA2_SOURCE, locator: `TA2 ID ${ta2Id}` }] },
          ...(tr
            ? { tr: { value: capitalizeTr(tr.madde), status: 'unverified', sources: [{ sourceId: TDK_SOURCE, locator: `madde "${tr.madde}" (madde_id ${tr.maddeId})`, note: `TDK tanımı: "${tr.definition}".` }] } }
            : {}),
        },
        externalIds: { fma: fmaIds[0], ta2: String(ta2Id) },
        systems: first.systems,
        regions: [t.region],
        regionBasis: 'authored',
        laterality: 'paired_generic',
        detailLevel: t.level,
        provenance: {
          createdBy: 'author:ai-draft',
          createdAt: today,
          updatedAt: today,
          notes: `Kapsam hedefi ${t.id as string} için genel (taraf belirtmeyen) kavram. FMA kimliği Wikidata'daki TA2 ${ta2Id} bağlantısından alındı. Sağ/sol örnekler: ${instances.map((i) => i.id).join(', ')}.`,
        },
      }
      overlayById.set(genericId, generic)
      for (const inst of instances) {
        const o = overlayById.get(inst.id)
        if (o) o.genericId = genericId
      }
      if (t.structureId !== genericId) {
        t.structureId = genericId
        changed = true
      }
      linked++
    }
    if (changed) await writeFile(join(scopeDir, file), prettyJson(targets))
  }

  const out = [...overlayById.values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  const outDir = join(CONTENT_DIR, 'structures', 'terminoloji')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'adlar.json'), prettyJson(out))
  console.log(
    `${matched.size}/${inventory.length} yapıya TA2 Latince adı, ${trCount} yapıya TDK Türkçe adı eklendi; ${linked} kapsam hedefi genel kayda bağlandı.\n` +
      'Tüm adlar "doğrulanmadı" durumundadır; uzman incelemesi gerekir (docs/uzman-inceleme.md).',
  )
}

await main()
