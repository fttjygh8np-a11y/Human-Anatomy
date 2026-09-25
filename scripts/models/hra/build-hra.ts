/**
 * `npm run models:hra` — HRA (HuBMAP) female reproductive organs: download (vendor/hra/, cached,
 * sha256 manifest) -> GLBs in public/models/hra/ + public/data/assets-hra.json.
 * See docs/model-katalogu.md ("HRA" section) for sources, license and frame conversion.
 *
 * Options:
 *   --offline            no network; build from the verified cache in vendor/hra
 *   --refresh            re-download every file (otherwise sha256-verified cache is reused)
 *   --write-structures   also regenerate content/structures/kadin/ureme.json from the catalogue
 *   --vendor <dir>       cache directory (default vendor/hra)
 *   --models-out <dir>   GLB output (default public/models/hra)
 *   --data-out <dir>     assets-hra.json output (default public/data)
 *   --date YYYY-MM-DD    provenance date (default SOURCE_DATE_EPOCH or today, UTC)
 *
 * Behind an HTTPS proxy Node's fetch needs NODE_USE_ENV_PROXY=1; when HTTPS_PROXY is set and that
 * variable is not, the script re-runs itself with it.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { argString, parseArgs, resolveBuildDate, toJson } from '../lib/util.ts'
import { buildHra } from './build.ts'
import { HRA_NODES } from './catalog.ts'
import { fetchHra, HraLicenseError, HraUnavailableError } from './fetch.ts'
import { HRA_DATASETS } from './source.ts'
import { HRA_STRUCTURES_FILE, hraStructureRecords } from './structures.ts'

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  const offline = args.has('offline')
  if (!offline && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      stdio: 'inherit',
      env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
    })
    return r.status ?? 1
  }
  const vendorDir = resolve(argString(args, 'vendor') ?? 'vendor/hra')
  const date = resolveBuildDate(argString(args, 'date'))
  const log = (m: string) => console.log(m)

  console.log(offline ? 'HRA önbelleği kullanılıyor (çevrimdışı).' : 'HRA veri kümeleri denetleniyor/indiriliyor…')
  const { manifest, datasets } = await fetchHra({
    vendorDir,
    datasets: HRA_DATASETS,
    nodesFor: (name) => HRA_NODES.filter((n) => n.dataset === name).map((n) => n.node),
    offline,
    refresh: args.has('refresh'),
    log,
  })
  for (const d of datasets) console.log(`✓ ${d.dataset.name} ${d.dataset.version} — lisans CC BY 4.0 (metadata.json), ${d.files.length} dosya`)

  const result = await buildHra({
    vendorDir,
    datasets,
    manifest,
    modelsDir: resolve(argString(args, 'models-out') ?? 'public/models/hra'),
    dataDir: resolve(argString(args, 'data-out') ?? 'public/data'),
    modelsUrlPrefix: 'models/hra/',
    date,
    log,
  })
  const { report } = result
  const lat = report.nodes.flatMap((n) => n.checks.filter((c) => c.check === 'laterality-centroid-sign'))
  console.log('')
  console.log(`Taraf denetimi — geçti: ${lat.filter((c) => c.result === 'pass').length}, kısmi: ${lat.filter((c) => c.result === 'partial').length}, başarısız: ${lat.filter((c) => c.result === 'fail').length}`)
  console.log(`Derlemeye alınmayan düğümler (${report.excluded.length}):`)
  for (const x of report.excluded) console.log(`  - ${x.dataset} ${x.node}: ${x.reason}`)

  if (args.has('write-structures')) {
    const path = resolve(HRA_STRUCTURES_FILE)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, toJson(hraStructureRecords()))
    console.log(`Yapı kayıtları yazıldı: ${HRA_STRUCTURES_FILE}`)
  }
  console.log(`${result.assets.length} varlık yazıldı; rapor: ${result.written[result.written.length - 1]}`)
  console.log('Sonraki adım: npm run content:build')
  return 0
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    if (err instanceof HraUnavailableError || err instanceof HraLicenseError) console.error(`\n${err.message}\n`)
    else console.error(`HATA: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  },
)
