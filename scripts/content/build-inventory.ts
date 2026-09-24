/**
 * npm run content:inventory
 *
 * Builds draft structure records from the BodyParts3D element list written by the model
 * pipeline (vendor/bodyparts3d/elements.json; expected shape documented in
 * ./lib/inventory.ts) into content/structures/_inventory/<system>.json.
 *
 *  - Records: id `fma:<n>`, English BodyParts3D name marked "unverified", review "draft",
 *    provenance createdBy "import:bodyparts3d". No Turkish/Latin names are generated.
 *  - Re-running regenerates the _inventory folder only; authored overlays elsewhere under
 *    content/structures/ are never touched. createdAt/updatedAt stay stable for unchanged records.
 *  - When the element list does not exist yet, prints a notice and exits 0.
 *
 * Options (for tests and dry runs): --elements <file>  --content-dir <dir>
 */
import { readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { structureSchema, type DetailLevel } from '../../src/core/schema.ts'
import { formatIssueReport, formatZodError, safeParseTr, summarize } from './lib/issues.ts'
import { ELEMENTS_FILE, buildInventory, groupBySystem, parseElements } from './lib/inventory.ts'
import { CONTENT_DIR, REPO_ROOT, argValue, prettyJson, readJsonTree, readOptionalJson, repoRelative, writeText } from './lib/io.ts'
import { isPlainObject } from './lib/merge.ts'

async function main(): Promise<number> {
  const elementsPath = resolve(argValue('--elements') ?? join(REPO_ROOT, ELEMENTS_FILE))
  const contentDir = resolve(argValue('--content-dir') ?? CONTENT_DIR)
  const inventoryDir = join(contentDir, 'structures', '_inventory')
  const elementsLabel = repoRelative(elementsPath)

  const input = await readOptionalJson(elementsPath).catch((e: unknown) => {
    console.error(`${elementsLabel} okunamadı: ${(e as Error).message}`)
    return undefined
  })
  if (input === undefined) return 1
  if (input === null) {
    console.log(
      `Bilgi: ${elementsLabel} bulunamadı; yapı envanteri oluşturulmadı.\n` +
        'Bu dosya model hattı tarafından üretilir: önce "npm run models:fetch" ve "npm run models:build" çalıştırın.\n' +
        'İçerik derlemesi yapı kaydı olmadan da çalışır (boş ama geçerli paket).',
    )
    return 0
  }

  const parsed = parseElements(input.data, elementsLabel)
  const content = await readJsonTree(contentDir)
  const regionIds = new Set<string>()
  const levelHints = new Map<string, DetailLevel>()
  const existing: unknown[] = []
  for (const f of content.files) {
    const items = Array.isArray(f.data) ? f.data : [f.data]
    if (f.path === 'taxonomy/regions.json') {
      for (const r of items) if (isPlainObject(r) && typeof r.id === 'string') regionIds.add(r.id)
    } else if (f.path.startsWith('scope/')) {
      for (const t of items) {
        if (isPlainObject(t) && typeof t.structureId === 'string' && typeof t.level === 'string') levelHints.set(t.structureId, t.level as DetailLevel)
      }
    } else if (f.path.startsWith('structures/_inventory/')) {
      existing.push(...items)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { records, issues } = buildInventory(parsed.elements, { today, existing, knownRegions: regionIds, levelHints })
  const allIssues = [...parsed.issues, ...issues]

  // Every generated record must be a valid structure (guards against format drift).
  for (const r of records) {
    const res = safeParseTr(structureSchema, r)
    if (!res.success) {
      console.error(`Üretilen kayıt geçersiz (${r.id}): ${formatZodError(res.error).join('; ')}`)
      return 1
    }
  }

  const groups = groupBySystem(records)
  const written = new Set<string>()
  for (const [system, list] of groups) {
    const file = `${system}.json`
    await writeText(join(inventoryDir, file), prettyJson(list))
    written.add(file)
  }
  let removed = 0
  for (const f of await readdir(inventoryDir).catch(() => [] as string[])) {
    if (f.endsWith('.json') && !written.has(f)) {
      await rm(join(inventoryDir, f))
      removed++
    }
  }

  const sum = summarize(allIssues)
  const sided = records.filter((r) => r.laterality === 'right' || r.laterality === 'left').length
  const paired = records.filter((r) => r.counterpartId).length
  console.log(`Yapı envanteri güncellendi: ${records.length} taslak kayıt (${parsed.elements.length} BodyParts3D öğesinden) → ${repoRelative(inventoryDir)}/`)
  console.log(`  Sistemler: ${[...groups].map(([s, l]) => `${s} ${l.length}`).join(', ') || '—'}`)
  console.log(`  Sağ/sol kayıt: ${sided}, karşı tarafı eşleşen: ${paired}. Bölgesi atanmamış: ${records.filter((r) => (r.regions ?? []).length === 0).length}.`)
  if (removed > 0) console.log(`  ${removed} eski envanter dosyası kaldırıldı.`)
  console.log('  Tüm adlar "doğrulanmadı", tüm inceleme durumları "taslak". Türkçe/Latince adlar kaynaklı eklerle eklenmeli (docs/icerik-rehberi.md).')
  if (sum.warnings + sum.errors > 0) console.log(formatIssueReport(allIssues))
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Envanter oluşturma beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
