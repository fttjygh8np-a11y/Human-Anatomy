/**
 * `npm run models:build` — BodyParts3D OBJ -> chunked, meshopt-compressed GLBs + public/data/assets.json
 * + vendor/bodyparts3d/elements.json. See docs/model-katalogu.md.
 *
 * Options:
 *   --input <dir>        extracted source (default vendor/bodyparts3d)
 *   --models-out <dir>   GLB output (default public/models/bp3d)
 *   --data-out <dir>     assets.json output (default public/data)
 *   --inventory-out <dir> elements.json + build-report.json (default: --input)
 *   --url-prefix <p>     file path prefix written to assets.json (default models/bp3d/)
 *   --config <file>      JSON override of scripts/models/config.ts defaults
 *   --date YYYY-MM-DD    provenance date (default SOURCE_DATE_EPOCH or today, UTC)
 *   --strict             exit 1 when a laterality or frame-axis check failed
 */
import { resolve } from 'node:path'
import { DEFAULT_CONFIG, loadConfigFile } from './config.ts'
import { buildModels } from './lib/pipeline.ts'
import { argString, parseArgs, resolveBuildDate } from './lib/util.ts'

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  const inputDir = resolve(argString(args, 'input') ?? 'vendor/bodyparts3d')
  const configPath = argString(args, 'config')
  const result = await buildModels({
    inputDir,
    modelsDir: resolve(argString(args, 'models-out') ?? 'public/models/bp3d'),
    dataDir: resolve(argString(args, 'data-out') ?? 'public/data'),
    inventoryDir: resolve(argString(args, 'inventory-out') ?? inputDir),
    modelsUrlPrefix: argString(args, 'url-prefix') ?? 'models/bp3d/',
    date: resolveBuildDate(argString(args, 'date')),
    config: configPath ? loadConfigFile(configPath) : DEFAULT_CONFIG,
    log: (m) => console.log(m),
  })
  const { report } = result
  console.log('')
  console.log(`Öğe: ${report.counts.elements}, üretilen: ${report.counts.built}, atlanan: ${report.counts.skipped}`)
  console.log(
    `Sınıflandırma — hiyerarşi: ${report.counts.classifiedByHierarchy}, sezgisel: ${report.counts.classifiedByHeuristic}, ` +
      `sınıflandırılamadı: ${report.counts.unclassified}`,
  )
  for (const c of report.frameChecks) console.log(`Çerçeve denetimi ${c.check}: ${c.result}`)
  console.log(`Sağ-sol denetimi — geçti: ${report.laterality.pass}, kısmi: ${report.laterality.partial}, başarısız: ${report.laterality.fail}`)
  for (const f of report.laterality.failures) console.log(`  ! ${f.elementId} ${f.name ?? ''}: ${f.details}`)
  for (const c of report.chunks.filter((c) => !c.budgetMet)) {
    console.log(`  ! ${c.chunk}: temel LOD ${c.baseTriangles} üçgen, bütçe ${c.budget} aşıldı (korunan öğeler/hata sınırı)`)
  }
  console.log(`${result.assets.length} varlık yazıldı; rapor: ${resolve(result.written[result.written.length - 1]!)}`)
  const failedFrame = report.frameChecks.some((c) => c.result === 'fail')
  if (failedFrame) console.log('  ! Çerçeve eksen denetimi başarısız: koordinat dönüşümünü kontrol edin (docs/model-katalogu.md).')
  if (args.has('strict') && (report.laterality.fail > 0 || failedFrame)) return 1
  return 0
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`HATA: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  },
)
