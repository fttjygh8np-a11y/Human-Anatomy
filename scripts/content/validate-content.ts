/**
 * npm run content:validate [-- --strict] [--json] [--content-dir <dir>] [--assets <file>]
 *
 * Validates content/** (+ public/data/assets.json when present) without writing anything:
 * schemas, referential integrity, part-of cycles, laterality/counterparts, verification
 * states vs. review records, reviewer rules, duplicate names and orphan model nodes.
 * Prints a Turkish report. Exit code 1 on errors (and on warnings with --strict).
 *
 * This is an automated check; it never replaces anatomy expert review.
 */
import { formatIssueReport, shouldFail, summarize } from './lib/issues.ts'
import { hasFlag } from './lib/io.ts'
import { summarizeContent } from './lib/integrity.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'

async function main(): Promise<number> {
  const strict = hasFlag('--strict')
  const { content, issues, assetsText } = await loadContent(pathsFromArgs())
  const summary = summarizeContent(content)
  const sum = summarize(issues)
  const failed = shouldFail(issues, strict)

  if (hasFlag('--json')) {
    console.log(JSON.stringify({ ok: !failed, strict, summary, errors: sum.errors, warnings: sum.warnings, issues }, null, 2))
    return failed ? 1 : 0
  }

  const c = summary.counts
  const lines = [
    'İçerik doğrulama raporu (otomatik kontrol — uzman incelemesinin yerine geçmez)',
    '==========================================================================',
    `Kayıtlar: ${c.systems} sistem, ${c.regions} bölge, ${c.structures} yapı, ${c.relations} ilişki, ${c.sources} kaynak, ` +
      `${c.assets} model varlığı (${c.assetNodes} düğüm), ${c.lessons} ders, ${c.questions} soru, ${c.reviews} inceleme kaydı, ${c.scope} kapsam hedefi.`,
  ]
  if (assetsText === null) lines.push('Model varlık dosyası (public/data/assets.json) yok; model eşleşmesi denetlenmedi.')
  if (c.structures! > 0) {
    const w = summary.structuresWithoutName
    const v = summary.structuresWithVerifiedName
    lines.push(
      `Ad durumu: Türkçe adı olmayan ${w.tr}, Latince adı olmayan ${w.la} yapı; doğrulanmış ad sayısı TR ${v.tr} / LA ${v.la} / EN ${v.en}.`,
      `Bölgesi atanmamış yapı: ${summary.structuresWithoutRegion}. Kaynağa göre: ${Object.entries(summary.structuresBySource)
        .map(([k, n]) => `${k} ${n}`)
        .join(', ')}.`,
    )
  }
  lines.push(`Taksonomide doğrulanmamış ad: ${summary.taxonomyUnverifiedNames}.`)
  lines.push(`Sonuç: ${sum.errors} hata, ${sum.warnings} uyarı${strict ? ' (--strict)' : ''} → ${failed ? 'BAŞARISIZ' : 'GEÇTİ'}`)
  console.log(lines.join('\n'))
  if (issues.length > 0) console.log(formatIssueReport(issues))
  return failed ? 1 : 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Doğrulama beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
