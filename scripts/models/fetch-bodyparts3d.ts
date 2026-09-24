/**
 * `npm run models:fetch` — downloads BodyParts3D 4.0 into vendor/bodyparts3d/ (gitignored).
 *
 *  1. Reads the directory listing of the archive (file names are discovered at runtime).
 *  2. Downloads the is-a OBJ archive (isa_BP3D_<ver>_obj_99.zip) and every .txt file of the listing
 *     (element parts / inclusion relation lists …), resuming partial downloads.
 *  3. Records url, size, sha256, Last-Modified/ETag and time in vendor/bodyparts3d/manifest.json.
 *  4. Streams the zip into vendor/bodyparts3d/<zip name without .zip>/ with fflate.
 *
 * Options:
 *   --base-url <url>     archive directory (default https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/)
 *   --dest <dir>         target directory (default vendor/bodyparts3d)
 *   --zip-pattern <re>   which zip(s) to fetch (default ^isa_BP3D_[\d.]+_obj_99\.zip$)
 *   --offline            no network: hash + unzip files already copied into --dest by hand
 *   --force-unzip        re-extract even if the manifest says the same zip was extracted
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { downloadWithResume, fetchChecked, parseDirectoryListing, SourceUnavailableError, unzipFile } from './lib/download.ts'
import { BP3D_ARCHIVE_URL, BP3D_SOURCE_ID, BP3D_VERSION } from './lib/source.ts'
import { argString, naturalCompare, parseArgs, sha256, sha256File, toJson } from './lib/util.ts'

interface ManifestFile {
  url: string | null
  bytes: number
  sha256: string
  fetchedAt: string | null
  lastModified: string | null
  etag: string | null
  obtained: 'download' | 'manual'
}

interface Manifest {
  manifestVersion: 1
  source: { id: string; version: string; baseUrl: string }
  listing: { url: string; sha256: string; fetchedAt: string; entries: string[] } | null
  files: Record<string, ManifestFile>
  extracted: Record<string, { dir: string; zipSha256: string; files: number; bytes: number; extractedAt: string }>
}

function readManifest(path: string, baseUrl: string): Manifest {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as Manifest
    } catch {
      console.warn(`Uyarı: ${path} okunamadı, yeniden oluşturulacak.`)
    }
  }
  return {
    manifestVersion: 1,
    source: { id: BP3D_SOURCE_ID, version: BP3D_VERSION, baseUrl },
    listing: null,
    files: {},
    extracted: {},
  }
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = argString(args, 'base-url') ?? BP3D_ARCHIVE_URL
  const dest = resolve(argString(args, 'dest') ?? 'vendor/bodyparts3d')
  const zipPattern = new RegExp(argString(args, 'zip-pattern') ?? '^isa_BP3D_[\\d.]+_obj_99\\.zip$', 'i')
  const offline = args.has('offline')
  mkdirSync(dest, { recursive: true })
  const manifestPath = join(dest, 'manifest.json')
  const manifest = readManifest(manifestPath, baseUrl)
  const save = () => writeFileSync(manifestPath, toJson(manifest))

  if (!offline) {
    console.log(`Dizin listesi okunuyor: ${baseUrl}`)
    const res = await fetchChecked(baseUrl, {}, dest)
    const html = await res.text()
    const entries = parseDirectoryListing(html, baseUrl)
    const wanted = entries.filter((e) => zipPattern.test(e.name) || e.name.toLowerCase().endsWith('.txt'))
    if (!wanted.some((e) => zipPattern.test(e.name))) {
      throw new Error(
        `Listede ${zipPattern} desenine uyan arşiv bulunamadı. Listelenen dosyalar: ${entries.map((e) => e.name).join(', ') || '(yok)'}`,
      )
    }
    manifest.listing = { url: baseUrl, sha256: sha256(html), fetchedAt: new Date().toISOString(), entries: entries.map((e) => e.name) }
    writeFileSync(join(dest, 'listing.html'), html)
    save()

    for (const entry of wanted) {
      const target = join(dest, entry.name)
      const known = manifest.files[entry.name]
      if (known && existsSync(target) && statSync(target).size === known.bytes && (await sha256File(target)) === known.sha256) {
        console.log(`✓ ${entry.name} zaten indirilmiş (sha256 doğrulandı)`)
        continue
      }
      console.log(`↓ ${entry.name}`)
      let lastPct = -1
      const result = await downloadWithResume(entry.url, target, {
        destDir: dest,
        onProgress: (got, total) => {
          if (!total) return
          const pct = Math.floor((got / total) * 10) * 10
          if (pct !== lastPct) {
            lastPct = pct
            process.stdout.write(`  %${pct} (${formatMB(got)} / ${formatMB(total)})\n`)
          }
        },
      })
      if (result.resumedFrom > 0) console.log(`  kaldığı yerden devam edildi (${formatMB(result.resumedFrom)})`)
      manifest.files[entry.name] = {
        url: entry.url,
        bytes: result.bytes,
        sha256: result.sha256,
        fetchedAt: new Date().toISOString(),
        lastModified: result.lastModified,
        etag: result.etag,
        obtained: 'download',
      }
      save()
      console.log(`  sha256 ${result.sha256}`)
    }
  } else {
    console.log(`Çevrimdışı mod: ${dest} içindeki elle kopyalanmış dosyalar kaydediliyor.`)
    const local = readdirSync(dest)
      .filter((n) => zipPattern.test(n) || n.toLowerCase().endsWith('.txt'))
      .sort(naturalCompare)
    if (!local.some((n) => zipPattern.test(n))) {
      throw new Error(`${dest} içinde ${zipPattern} desenine uyan zip dosyası yok. Dosyaları önce bu klasöre kopyalayın.`)
    }
    for (const name of local) {
      const path = join(dest, name)
      const digest = await sha256File(path)
      const known = manifest.files[name]
      if (known && known.sha256 === digest) continue
      manifest.files[name] = {
        url: null,
        bytes: statSync(path).size,
        sha256: digest,
        fetchedAt: null,
        lastModified: null,
        etag: null,
        obtained: 'manual',
      }
      console.log(`✓ ${name} sha256 ${digest}`)
    }
    save()
  }

  for (const [name, file] of Object.entries(manifest.files).sort((a, b) => naturalCompare(a[0], b[0]))) {
    if (!zipPattern.test(name)) continue
    const dirName = name.replace(/\.zip$/i, '')
    const prev = manifest.extracted[name]
    if (!args.has('force-unzip') && prev && prev.zipSha256 === file.sha256 && existsSync(join(dest, dirName))) {
      console.log(`✓ ${name} daha önce açılmış (${prev.files} dosya)`)
      continue
    }
    console.log(`Arşiv açılıyor: ${name} → ${dirName}/`)
    const out = await unzipFile(join(dest, name), join(dest, dirName))
    manifest.extracted[name] = { dir: dirName, zipSha256: file.sha256, files: out.files, bytes: out.bytes, extractedAt: new Date().toISOString() }
    save()
    console.log(`  ${out.files} dosya, ${formatMB(out.bytes)}`)
  }
  console.log(`Bitti. Kayıt: ${manifestPath}`)
  console.log('Sonraki adım: npm run models:build')
  return 0
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    if (err instanceof SourceUnavailableError) console.error(`\n${err.message}\n`)
    else console.error(`HATA: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  },
)
