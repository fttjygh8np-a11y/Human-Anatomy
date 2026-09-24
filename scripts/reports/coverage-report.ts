/**
 * npm run report:coverage [--content-dir <dir>] [--assets <file>] [--report-dir <dir>]
 *
 * Scope-matrix coverage report: docs/raporlar/kapsam.md (Turkish) + docs/raporlar/kapsam.json.
 * Reads content/** and public/data/assets.json directly (no prior build needed).
 */
import { join, resolve } from 'node:path'
import { summarize } from '../content/lib/issues.ts'
import { REPO_ROOT, argValue, prettyJson, repoRelative, writeText } from '../content/lib/io.ts'
import { buildTimestamp, contentVersionOf } from '../content/lib/manifest.ts'
import { loadContent, pathsFromArgs } from '../content/lib/pipeline.ts'
import { DIMENSIONS, DIMENSION_LABEL, computeCoverage, renderCoverageMarkdown } from './lib/coverage.ts'

async function main(): Promise<number> {
  const reportDir = resolve(argValue('--report-dir') ?? join(REPO_ROOT, 'docs', 'raporlar'))
  const { content, issues, inputs } = await loadContent(pathsFromArgs())
  const automated = summarize(issues)
  const report = computeCoverage(content, { generatedAt: buildTimestamp(), contentVersion: contentVersionOf(inputs), automated })

  await writeText(join(reportDir, 'kapsam.md'), renderCoverageMarkdown(report))
  await writeText(join(reportDir, 'kapsam.json'), prettyJson(report))

  const t = report.totals
  console.log(`Kapsam raporu yazıldı → ${repoRelative(join(reportDir, 'kapsam.md'))} (+ kapsam.json)`)
  console.log(`  Hedef yapı: ${t.total}. ${DIMENSIONS.map((d) => `${DIMENSION_LABEL[d]}: ${t.done[d]}`).join(' · ')}`)
  if (automated.errors > 0) console.log(`  Uyarı: içerikte ${automated.errors} doğrulama hatası var; rapor eksik kayıtlarla üretildi (npm run content:validate).`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Kapsam raporu beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
