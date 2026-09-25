/**
 * npm run content:build [-- --strict] [--content-dir <dir>] [--out <dir>] [--assets <file>]
 *
 * Compiles content/** into public/data/*.json (DATA_FILES): validates every record with the
 * core zod schemas, runs the integrity checks, computes the manifest and self-checks the
 * output with the same schemas the browser loader uses.
 *
 *  - public/data/assets.json belongs to the model pipeline: it is kept as is and only
 *    cross-checked; when it does not exist yet an empty list is written so the bundle is
 *    complete and loadable.
 *  - Errors always fail the build. Warnings (e.g. model nodes without an inventory record)
 *    fail only with --strict (release builds).
 *  - Works with no structure data at all (empty but valid bundle).
 */
import { join, resolve } from 'node:path'
import { DATA_FILES } from '../../src/data/types.ts'
import { DATA_FILE_SCHEMAS } from '../../src/data/loader.ts'
import { error, formatIssueReport, formatZodError, shouldFail, summarize, trErrorMap } from './lib/issues.ts'
import { hasFlag, repoRelative, writeText } from './lib/io.ts'
import { buildManifest, buildTimestamp, contentOutputs, contentVersionOf, type DataKey } from './lib/manifest.ts'
import { loadContent, pathsFromArgs } from './lib/pipeline.ts'

async function main(): Promise<number> {
  const strict = hasFlag('--strict')
  const paths = pathsFromArgs()
  const { content, issues, inputs, assetsText, assetsMerged } = await loadContent(paths)
  const outFor = (key: DataKey) => join(paths.publicDir, DATA_FILES[key])
  const outLabel = repoRelative(join(paths.publicDir, 'data'))

  const texts: Partial<Record<DataKey, string>> = {}
  for (const [key, value] of Object.entries(contentOutputs(content))) texts[key as DataKey] = JSON.stringify(value)
  texts.assets = assetsText ?? '[]'

  const contentVersion = contentVersionOf(inputs)
  const manifest = buildManifest({ content, contentVersion, generatedAt: buildTimestamp(), fileTexts: texts })
  texts.manifest = JSON.stringify(manifest)

  // Self-check: the written files must pass the browser loader's schemas.
  for (const [key, text] of Object.entries(texts) as [DataKey, string][]) {
    const r = DATA_FILE_SCHEMAS[key].safeParse(JSON.parse(text), { error: trErrorMap })
    if (!r.success) issues.push(error('output_check', `Çıktı yükleyici şemasını geçmiyor — ${formatZodError(r.error).slice(0, 5).join('; ')}`, { file: repoRelative(outFor(key)) }))
  }

  const sum = summarize(issues)
  const report = formatIssueReport(issues)
  if (shouldFail(issues, strict)) {
    console.error(`İçerik derlemesi başarısız: ${sum.errors} hata, ${sum.warnings} uyarı${strict ? ' (--strict: uyarılar da engelleyici)' : ''}.`)
    console.error(report)
    console.error(`\n${outLabel} dosyaları yazılmadı.`)
    return 1
  }

  for (const [key, text] of Object.entries(texts) as [DataKey, string][]) {
    if (key === 'manifest') continue
    // assets.json is owned by the model pipeline: never rewrite it in place.
    if (key === 'assets' && assetsText !== null && !assetsMerged && resolve(paths.assetsPath) === resolve(outFor('assets'))) continue
    await writeText(outFor(key), text)
  }
  await writeText(outFor('manifest'), texts.manifest)

  const c = manifest.counts
  console.log(`İçerik derlendi → ${outLabel} (içerik sürümü ${contentVersion}).`)
  console.log(
    `  ${c.systems} sistem, ${c.regions} bölge, ${c.structures} yapı, ${c.relations} ilişki, ${c.sources} kaynak, ` +
      `${c.assets} model varlığı (${c.assetNodes} düğüm), ${c.lessons} ders, ${c.questions} soru, ${c.reviews} inceleme kaydı, ${c.scope} kapsam hedefi.`,
  )
  if (assetsText === null) console.log(`  Bilgi: ${repoRelative(paths.assetsPath)} yoktu; boş model listesi yazıldı (model hattı henüz çalışmamış).`)
  if (c.structures === 0) console.log('  Bilgi: Henüz yapı kaydı yok. BodyParts3D envanteri için: npm run content:inventory')
  if (sum.warnings > 0) {
    console.log(`  ${sum.warnings} uyarı (yayın öncesi giderilmeli; --strict ile derleme durur):`)
    console.log(report)
  }
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('İçerik derlemesi beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
