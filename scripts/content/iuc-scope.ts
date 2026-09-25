/**
 * `npm run content:iuc-scope` — Dönem 1–2 scope from the İÜC textbooks (CC BY 4.0).
 *
 * A structure is in the core curriculum when its Latin name (TA2 term or Latin synonym) occurs in
 * one of the three books. Each such structure becomes a scope target at level "basic" with the
 * first page that names it as basis (locator + exact quote, checked by content:quotecheck).
 * Right/left instances are covered through their generic concept. Structures without a region
 * cannot be scope targets yet (a target needs one region); they are counted and listed.
 *
 * Output (generated, do not edit): content/scope/iuc-donem12.json and
 * docs/raporlar/iuc-kapsam-disi.md (book structures that could not become targets).
 * Targets already defined in other scope files are left alone.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Structure } from '../../src/core/schema.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson, readJsonTree, writeText } from './lib/io.ts'
import { IUC_BOOKS, normalizeForQuote, type BookPage } from './lib/iuc.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'

const OUT = 'scope/iuc-donem12.json'
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Abbreviations the books use for the leading Latin noun ("M. biceps brachii", "N. axillaris"). */
const ABBREVIATIONS: [RegExp, string][] = [
  [/^musculus /, 'm. '],
  [/^musculi /, 'mm. '],
  [/^nervus /, 'n. '],
  [/^nervi /, 'nn. '],
  [/^arteria /, 'a. '],
  [/^arteriae /, 'aa. '],
  [/^vena /, 'v. '],
  [/^venae /, 'vv. '],
  [/^ligamentum /, 'lig. '],
  [/^ligamenta /, 'ligg. '],
  [/^ramus /, 'r. '],
  [/^rami /, 'rr. '],
]

/** Latin forms of a structure worth searching for (short words such as "cor" match too much). */
function latinForms(s: Structure): string[] {
  const forms = [s.names.la?.value, ...(s.synonyms ?? []).filter((x) => x.lang === 'la').map((x) => x.value)].filter((x): x is string => !!x)
  const withAbbreviations = forms.flatMap((f) => [f, ...ABBREVIATIONS.filter(([re]) => re.test(f)).map(([re, abbr]) => f.replace(re, abbr))])
  return [...new Set(withAbbreviations.filter((x) => x.replace(/\s/g, '').length >= 5 && !/[[\]]/.test(x)))]
}

async function main(): Promise<number> {
  const { content } = await loadContent(pathsFromArgs())
  const pages: { sourceId: string; page: BookPage; text: string }[] = []
  for (const b of IUC_BOOKS) {
    let list: BookPage[]
    try {
      list = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'iuc', `${b.file}.pages.json`), 'utf8')) as { pages: BookPage[] }).pages
    } catch {
      console.error('İÜC sayfa metinleri yok; önce "npm run content:iuc" çalıştırın.')
      return 1
    }
    for (const p of list) if (p.printed !== null) pages.push({ sourceId: b.sourceId, page: p, text: normalizeForQuote(p.text) })
  }

  // Structures already targeted by hand-written scope files keep their targets.
  const tree = await readJsonTree(CONTENT_DIR)
  const targeted = new Set<string>()
  for (const f of tree.files) {
    if (!f.path.startsWith('scope/') || f.path === OUT) continue
    for (const t of (Array.isArray(f.data) ? f.data : [f.data]) as { structureId?: string; id: string }[]) targeted.add(t.structureId ?? t.id)
  }

  const targets: Record<string, unknown>[] = []
  const regionless: { s: Structure; where: string }[] = []
  for (const s of content.structures) {
    if ((s.laterality === 'right' || s.laterality === 'left') && s.genericId) continue // via the generic concept
    if (targeted.has(s.id)) continue
    let hit: { sourceId: string; printed: number; quote: string } | undefined
    for (const form of latinForms(s)) {
      const re = new RegExp(`(?<!\\p{L})${escape(form).replace(/\s+/g, '\\s+')}(?!\\p{L})`, 'iu')
      for (const p of pages) {
        const m = re.exec(p.text)
        if (m) {
          hit = { sourceId: p.sourceId, printed: p.page.printed!, quote: m[0] }
          break
        }
      }
      if (hit) break
    }
    if (!hit) continue
    const where = `${hit.sourceId.replace('src:iuc-', '')} s. ${hit.printed}`
    const region = s.regions[0]
    if (!region) {
      regionless.push({ s, where })
      continue
    }
    targets.push({
      id: `hedef:iuc.${s.id.replace(':', '-')}`,
      structureId: s.id,
      system: s.systems[0],
      region,
      kind: s.kind,
      level: 'basic',
      name: { en: s.names.en.value, ...(s.names.la ? { la: s.names.la.value } : {}), ...(s.names.tr ? { tr: s.names.tr.value } : {}) },
      laterality: s.laterality,
      basis: [{ sourceId: hit.sourceId, locator: `s. ${hit.printed}`, quote: hit.quote }],
      notes: 'Dönem 1–2 çekirdek: yapının Latince adı İÜC ders kitabında geçiyor (otomatik tarama; uzman kapsam onayı yok).',
    })
  }
  targets.sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  await writeFile(join(CONTENT_DIR, OUT), prettyJson(targets))

  const lines = [
    '# İÜC kitaplarında geçen ama kapsam hedefi yapılamayan yapılar',
    '',
    '> Otomatik üretilir (`npm run content:iuc-scope`). Bu yapıların Latince adı Dönem 1–2 ders',
    '> kitaplarında geçiyor, ancak henüz bir bölgeye atanmadıkları için kapsam matrisine alınamadı.',
    '> Bölge ataması (content/structures altında bir ek dosyayla) yapıldığında otomatik olarak hedef olurlar.',
    '',
    '| Yapı | Latince | İlk geçtiği yer |',
    '| --- | --- | --- |',
    ...regionless.map(({ s, where }) => `| ${s.names.tr?.value ?? s.names.en.value} (\`${s.id}\`) | ${s.names.la?.value ?? '—'} | ${where} |`),
    '',
  ]
  await writeText(join(REPO_ROOT, 'docs', 'raporlar', 'iuc-kapsam-disi.md'), lines.join('\n'))
  console.log(
    `Dönem 1–2 kapsam hedefi: ${targets.length} (İÜC kitaplarında adı geçen yapılar); bölgesi olmadığı için hedef yapılamayan: ${regionless.length} → docs/raporlar/iuc-kapsam-disi.md`,
  )
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Kapsam üretilemedi:', e)
    process.exitCode = 1
  },
)
