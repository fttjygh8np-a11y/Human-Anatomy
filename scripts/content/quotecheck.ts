/**
 * `npm run content:quotecheck` — verifies every source reference that carries a `quote` against the
 * page texts of its source (İÜC books, vendor/iuc/*.pages.json from `npm run content:iuc`): the quote
 * must occur on the printed pages named by the locator ("Bölüm x.y, s. N" / "s. N-M").
 *
 * This is an automated check of "the source really says this", not an expert review: a passing
 * quote can still be attached to the wrong structure. Exit code 1 on any failure; references to
 * sources without page texts are counted separately (not checked).
 *
 * Options: --json (machine-readable result), --allow-missing (do not fail when page texts are absent).
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceRef } from '../../src/core/schema.ts'
import { REPO_ROOT } from './lib/io.ts'
import { IUC_BOOKS, pagesOfLocator, quoteOccurs, type BookPage } from './lib/iuc.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'

interface Failure {
  where: string
  sourceId: string
  locator: string | undefined
  quote: string
  reason: string
}

/** All source references below `value`, with a readable path. */
function* refsIn(value: unknown, where: string): Generator<{ where: string; ref: SourceRef }> {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* refsIn(value[i], `${where}[${i}]`)
  } else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.sourceId === 'string') yield { where, ref: o as unknown as SourceRef }
    else for (const [k, v] of Object.entries(o)) yield* refsIn(v, where ? `${where}.${k}` : k)
  }
}

async function main(): Promise<number> {
  const json = process.argv.includes('--json')
  const allowMissing = process.argv.includes('--allow-missing')
  const { content } = await loadContent(pathsFromArgs())

  const pagesBySource = new Map<string, BookPage[]>()
  const missingTexts: string[] = []
  for (const b of IUC_BOOKS) {
    const file = join(REPO_ROOT, 'vendor', 'iuc', `${b.file}.pages.json`)
    if (!existsSync(file)) {
      missingTexts.push(b.sourceId)
      continue
    }
    pagesBySource.set(b.sourceId, (JSON.parse(await readFile(file, 'utf8')) as { pages: BookPage[] }).pages)
  }

  const groups: [string, unknown][] = [
    ...content.structures.map((s) => [s.id, s] as [string, unknown]),
    ...content.relations.map((r) => [`ilişki ${r.id}`, r] as [string, unknown]),
    ...content.lessons.map((l) => [l.id, l] as [string, unknown]),
    ...content.questions.map((q) => [q.id, q] as [string, unknown]),
  ]
  let checked = 0
  let unchecked = 0
  const failures: Failure[] = []
  const bookIds = new Set(IUC_BOOKS.map((b) => b.sourceId))
  for (const [id, value] of groups) {
    for (const { where, ref } of refsIn(value, '')) {
      if (bookIds.has(ref.sourceId) && !ref.quote) {
        failures.push({ where: `${id} ${where}`, sourceId: ref.sourceId, locator: ref.locator, quote: '', reason: 'İÜC kaynağında alıntı (quote) zorunlu' })
        continue
      }
      if (!ref.quote) continue
      const pages = pagesBySource.get(ref.sourceId)
      if (!pages) {
        unchecked++
        continue
      }
      checked++
      const printed = pagesOfLocator(ref.locator)
      if (printed.length === 0) {
        failures.push({ where: `${id} ${where}`, sourceId: ref.sourceId, locator: ref.locator, quote: ref.quote, reason: 'konumda sayfa yok (ör. "Bölüm 1.1, s. 5")' })
      } else if (!quoteOccurs(pages, printed, ref.quote)) {
        failures.push({ where: `${id} ${where}`, sourceId: ref.sourceId, locator: ref.locator, quote: ref.quote, reason: 'alıntı belirtilen sayfalarda bulunamadı' })
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ checked, unchecked, failures, missingTexts }, null, 2))
  } else {
    console.log('Alıntı denetimi (otomatik kontrol — uzman incelemesinin yerine geçmez)')
    console.log(`Denetlenen alıntı: ${checked} · sayfa metni olmayan kaynaklarda: ${unchecked} · hata: ${failures.length}`)
    if (missingTexts.length) console.log(`Sayfa metni yok (npm run content:iuc): ${missingTexts.join(', ')}`)
    for (const f of failures.slice(0, 50)) console.log(`  ✗ ${f.where} [${f.sourceId}, ${f.locator ?? 'konum yok'}]: ${f.reason}${f.quote ? ` — "${f.quote.slice(0, 90)}"` : ''}`)
    if (failures.length > 50) console.log(`  … ${failures.length - 50} hata daha`)
  }
  if (missingTexts.length && !allowMissing) {
    console.error('İÜC sayfa metinleri eksik; önce `npm run content:iuc` çalıştırın.')
    return 1
  }
  return failures.length ? 1 : 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Alıntı denetimi beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
