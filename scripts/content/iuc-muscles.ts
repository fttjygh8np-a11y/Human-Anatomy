/**
 * `npm run content:iuc-muscles` — muscle info cards from "Lokomotor Sistem Anatomisi" (İÜC,
 * CC BY 4.0), chapters 3.1–3.5 (myology). The book describes each muscle as
 *
 *   M. teres minor:
 *   Başlangıcı: Scapula'nın margo lateralis'inin 2/3 üst parçasından başlar.
 *   Sonlanışı: Tuberculum majus'un en alt kısmında sonlanır.
 *   İşlevi: Kola dışa rotasyon yaptırır.
 *   Siniri: N. axillaris'tir.
 *
 * Each labelled sentence is taken verbatim (quote + printed page; checked by content:quotecheck):
 * Başlangıcı → origin, Sonlanışı → insertion, İşlevi → action, Siniri → relationsText, an unlabelled
 * first sentence → summary, and the group headings above the muscle ("Kol Kasları › Ön bölge
 * kasları") → location. When the nerve has a structure record, an `innervated_by` relation is
 * added too. Muscles are matched to structures through their TA2 Latin term ("M. x" = "musculus x").
 *
 * Output (generated): content/structures/iuc/kaslar.json, content/relations/iuc-kaslar.json.
 * Everything stays "unverified": the text is the book's, the match to the 3D structure is automatic.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Structure } from '../../src/core/schema.ts'
import { CONTENT_DIR, REPO_ROOT, prettyJson } from './lib/io.ts'
import { latinKey, normalizeForQuote, parseMuscleBlocks, type BookPage, type MuscleLine } from './lib/iuc.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'
import type { Ta2Term } from './lib/terminology.ts'

const SOURCE = 'src:iuc-lokomotor'
const FIRST_PAGE = 64
const LAST_PAGE = 101
const LABELS = { 'Başlangıcı': 'origin', 'Sonlanışı': 'insertion', 'İşlevi': 'action', 'Siniri': 'nerve' } as const
const LABEL = /^\s*(Başlangıcı|Sonlanışı|İşlevi|Siniri)\s*:\s*(.*)$/
const RUNNING_HEADER = /^\s*(Lokomotor Sistem Anatomisi|Bölüm \d+\.\d+:.*)\s*$/

const clean = (s: string) => s.replace(/›/g, "'").trim()
const pagesOf = (lines: MuscleLine[]) => {
  const ps = [...new Set(lines.map((l) => l.page))]
  return ps.length > 1 ? `s. ${ps[0]}-${ps.at(-1)}` : `s. ${ps[0]}`
}

async function main(): Promise<number> {
  let pages: BookPage[]
  try {
    pages = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'iuc', 'lokomotor-sistem-anatomisi.pages.json'), 'utf8')) as { pages: BookPage[] }).pages
  } catch {
    console.error('İÜC sayfa metinleri yok; önce "npm run content:iuc" çalıştırın.')
    return 1
  }
  const lines: MuscleLine[] = []
  for (const p of pages) {
    if (p.printed === null || p.printed < FIRST_PAGE || p.printed > LAST_PAGE) continue
    // The page number and running header would cut a field that continues on the next page.
    const text = p.text.split('\n')
    const skip = (i: number) => (i === 0 && /^\s*\d+\s*$/.test(text[i]!)) || (i <= 1 && RUNNING_HEADER.test(text[i]!))
    text.forEach((t, i) => skip(i) || lines.push({ text: t, page: p.printed! }))
  }
  const blocks = parseMuscleBlocks(lines)

  const ta2 = (JSON.parse(await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8')) as { data: Ta2Term[] }).data
  const ta2ByLatin = new Map<string, number[]>()
  for (const t of ta2) for (const la of [t.term.la, ...(t.synonyms?.la ?? [])]) if (la) ta2ByLatin.set(latinKey(la), [...(ta2ByLatin.get(latinKey(la)) ?? []), t.id])
  const { content } = await loadContent(pathsFromArgs())
  const byTa2 = new Map<string, Structure[]>()
  for (const s of content.structures) if (s.externalIds.ta2) byTa2.set(s.externalIds.ta2, [...(byTa2.get(s.externalIds.ta2) ?? []), s])
  /** Records to describe: generic concepts and unpaired records (sided instances show the generic text). */
  const targetsFor = (latin: string): Structure[] => {
    const found = (ta2ByLatin.get(latinKey(latin)) ?? []).flatMap((id) => byTa2.get(String(id)) ?? [])
    const primary = found.filter((s) => !((s.laterality === 'right' || s.laterality === 'left') && s.genericId))
    return primary.length > 0 ? primary : found
  }

  const overlays = new Map<string, Record<string, unknown>>()
  const relations: Record<string, unknown>[] = []
  let parsedWithFields = 0
  const unmatched: string[] = []
  for (const b of blocks) {
    const fields = b.fields.filter((f) => f.lines.length > 0)
    if (!fields.some((f) => f.label !== 'summary')) continue
    parsedWithFields++
    const targets = targetsFor(`musculus ${b.name}`)
    if (targets.length === 0) {
      unmatched.push(b.name)
      continue
    }
    const contentFields: Record<string, unknown> = {}
    let nerve: { name: string; quote: string; locator: string } | undefined
    for (const f of fields) {
      const raw = f.lines.map((l) => l.text).join('\n')
      // A field that runs onto the next page is quoted page by page ("… " marks the page break).
      const quote = [...new Set(f.lines.map((l) => l.page))].map((pg) => normalizeForQuote(f.lines.filter((l) => l.page === pg).map((l) => l.text).join('\n'))).join(' … ')
      const value = clean(normalizeForQuote(raw).replace(LABEL, '$2'))
      if (!value) continue
      const src = { sourceId: SOURCE, locator: pagesOf(f.lines), quote }
      const entry = (v: string) => ({ status: 'present', value: v, verification: 'unverified', sources: [src] })
      if (f.label === 'summary') contentFields.summary ??= entry(value)
      else if (LABELS[f.label] === 'nerve') {
        contentFields.relationsText = entry(`Siniri: ${value}`)
        const n = /^N\.\s*([a-z][a-z ]+?)['’›]/i.exec(value)
        if (n) nerve = { name: `nervus ${n[1]!.trim().toLowerCase()}`, quote, locator: src.locator }
      } else contentFields[LABELS[f.label]] ??= entry(value)
    }
    // Location: the book's group headings above the muscle ("Uyluk Kasları › Uyluğun Arka
    // Tarafındaki Kaslar"), each heading quoted on its own page.
    if (b.section.length > 0) {
      contentFields.location = {
        status: 'present',
        value: b.section.map((h) => clean(h.text)).join(' › '),
        verification: 'unverified',
        sources: b.section.map((h) => ({ sourceId: SOURCE, locator: `s. ${h.page}`, quote: normalizeForQuote(h.text), note: 'Kitaptaki grup başlığı.' })),
      }
    }
    for (const t of targets) {
      overlays.set(t.id, { id: t.id, content: { ...((overlays.get(t.id)?.content as object) ?? {}), ...contentFields } })
      const nerves = nerve ? targetsFor(nerve.name) : []
      for (const n of nerves) {
        relations.push({
          id: `rel:iuc.innervated_by.${t.id}.${n.id}`,
          type: 'innervated_by',
          from: t.id,
          to: n.id,
          sources: [{ sourceId: SOURCE, locator: nerve!.locator, quote: nerve!.quote }],
          verification: 'unverified',
          review: 'draft',
          provenance: 'author:ai-draft',
          note: 'Kitaptaki "Siniri:" cümlesinden otomatik çıkarıldı; kas ve sinir TA2 Latince adlarıyla eşleştirildi.',
        })
      }
    }
  }

  await mkdir(join(CONTENT_DIR, 'structures', 'iuc'), { recursive: true })
  const out = [...overlays.values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  await writeFile(join(CONTENT_DIR, 'structures', 'iuc', 'kaslar.json'), prettyJson(out))
  const uniqueRelations = [...new Map(relations.map((r) => [r.id as string, r])).values()].sort((a, b) => ((a.id as string) < (b.id as string) ? -1 : 1))
  await writeFile(join(CONTENT_DIR, 'relations', 'iuc-kaslar.json'), prettyJson(uniqueRelations))
  console.log(
    `Kitaptaki kas bloğu: ${blocks.length} (alanlı ${parsedWithFields}); bilgi kartı yazılan yapı: ${out.length}; ` +
      `innervasyon ilişkisi: ${uniqueRelations.length}. Yapısı bulunamayan kas: ${unmatched.length}${unmatched.length ? ` (${unmatched.join(', ')})` : ''}.`,
  )
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Kas bilgileri çıkarılamadı:', e)
    process.exitCode = 1
  },
)
