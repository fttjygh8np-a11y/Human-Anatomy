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
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { structureSchema, type DetailLevel } from '../../src/core/schema.ts'
import { formatIssueReport, formatZodError, safeParseTr, summarize } from './lib/issues.ts'
import { ELEMENTS_FILE, buildInventory, groupBySystem, parseElements, type PartOfWhole } from './lib/inventory.ts'
import { CONTENT_DIR, REPO_ROOT, argValue, prettyJson, readJsonTree, readOptionalJson, repoRelative, writeText } from './lib/io.ts'
import { isPlainObject } from './lib/merge.ts'
import { indexTa2, matchTa2, type Ta2Term } from './lib/terminology.ts'
import { lateralityFromEnglishName } from '../../src/core/frame.ts'

/**
 * Part-of wholes (heart, right lung, sternum, …) from the BodyParts3D part-of lists, limited to
 * names that match exactly one TA2 term (standard anatomical wholes; groupings such as "content of
 * thorax" or "systemic arterial tree" have no TA2 term). Without the TA2 snapshot
 * (npm run content:terms) no wholes are added.
 */
/** Muscle name → TA2 muscle term (+ FMA id from content/terminology/ta2-fma.json when known). */
async function loadMuscleTerms() {
  const ta2Text = await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8').catch(() => null)
  if (!ta2Text) return undefined
  const idx = indexTa2((JSON.parse(ta2Text) as { data: Ta2Term[] }).data)
  const crosswalk = (JSON.parse(await readFile(join(CONTENT_DIR, 'terminology', 'ta2-fma.json'), 'utf8').catch(() => '{"map":{}}')) as { map: Record<string, string[]> }).map
  return {
    resolve: (name: string) => {
      const hit = matchTa2({ id: 'x', names: { en: { value: name } }, laterality: 'unpaired', kind: 'muscle', externalIds: {} }, idx, new Map())
      // TA2 often gives the bare name as the Latin term and "musculus x" as a synonym ("pronator teres").
      if (!hit || ![hit.term.term.la, ...(hit.term.synonyms?.la ?? [])].some((la) => la?.startsWith('musculus '))) return null
      const fma = crosswalk[String(hit.term.id)] ?? []
      return { ta2Id: hit.term.id, ...(fma.length === 1 ? { fmaId: fma[0] } : {}) }
    },
  }
}

async function loadWholes(dir: string): Promise<PartOfWhole[]> {
  const read = (f: string) =>
    readFile(join(dir, f), 'utf8')
      .then((t) => t.split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split('\t')))
      .catch(() => [] as string[][])
  const names = await read('partof_parts_list_e.txt')
  const parts = await read('partof_element_parts.txt')
  const ta2Text = await readFile(join(REPO_ROOT, 'vendor', 'terminology', 'ta2.json'), 'utf8').catch(() => null)
  if (!ta2Text || names.length === 0) return []
  const idx = indexTa2((JSON.parse(ta2Text) as { data: Ta2Term[] }).data)
  const elementsOf = new Map<string, string[]>()
  for (const [c, , fj] of parts) if (c && fj) elementsOf.set(c, [...(elementsOf.get(c) ?? []), fj.trim()])
  const out: PartOfWhole[] = []
  for (const [c, , name] of names) {
    const m = /^FMA(\d+)$/.exec(c?.trim() ?? '')
    if (!m || !name?.trim() || /\b(system|content|compartment)\b|body proper|human body/.test(name)) continue
    const like = { id: `fma:${m[1]}`, names: { en: { value: name.trim() } }, laterality: lateralityFromEnglishName(name) ?? 'unpaired', kind: 'other', externalIds: {} }
    const hit = matchTa2(like, idx, new Map())
    if (!hit) continue
    out.push({ fmaId: m[1]!, name: name.trim(), elementIds: elementsOf.get(c!.trim()) ?? [], basis: `adı TA2 ${hit.term.id} ("${hit.term.term.la}") terimiyle eşleşiyor` })
  }
  return out
}

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

  // FMA concept names from the BodyParts3D relation lists (parent/child id + name columns).
  const conceptNames = new Map<string, string>()
  for (const f of ['isa_inclusion_relation_list.txt', 'partof_inclusion_relation_list.txt']) {
    const text = await readFile(join(dirname(elementsPath), f), 'utf8').catch(() => '')
    for (const line of text.split(/\r?\n/).slice(1)) {
      const [pid, pname, cid, cname] = line.split('\t')
      for (const [id, name] of [[pid, pname], [cid, cname]] as const) {
        const m = /^FMA(\d+)$/.exec(id?.trim() ?? '')
        if (m && name?.trim() && !conceptNames.has(m[1]!)) conceptNames.set(m[1]!, name.trim())
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const wholes = await loadWholes(dirname(elementsPath))
  const muscleTerms = await loadMuscleTerms()
  const opts = { today, existing, knownRegions: regionIds, levelHints, conceptNames, wholes, muscleTerms }
  let { records, issues } = buildInventory(parsed.elements, opts)

  // Link scope targets without a structure to the generic concept of the same English name.
  const norm = (x: string) => x.toLowerCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim()
  const generics = new Map(records.filter((r) => r.laterality === 'paired_generic').map((r) => [norm(r.names.en.value), r.id]))
  let newLinks = 0
  for (const f of content.files.filter((x) => x.path.startsWith('scope/'))) {
    const targets = f.data as Record<string, unknown>[]
    let changed = false
    for (const t of targets) {
      if (typeof t.structureId === 'string') continue
      const en = norm((t.name as { en: string }).en)
      const id = generics.get(en) ?? generics.get(`${en} bone`)
      if (!id) continue
      t.structureId = id
      if (typeof t.level === 'string') levelHints.set(id, t.level as DetailLevel)
      changed = true
      newLinks++
    }
    if (changed) await writeFile(join(contentDir, f.path), prettyJson(targets))
  }
  if (newLinks > 0) ({ records, issues } = buildInventory(parsed.elements, opts))
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
  console.log(`  Genel (taraf belirtmeyen) kavram: ${records.filter((r) => r.laterality === 'paired_generic').length}. Yeni bağlanan kapsam hedefi: ${newLinks}.`)
  console.log(`  Baş/parçalarından kurulan bütün kas: ${records.filter((r) => r.provenance.notes?.startsWith('Bütün kas')).length}.`)
  console.log(`  Bütün yapı (parça-bütün listesinden, TA2 ile eşleşen): ${records.filter((r) => r.provenance.notes?.startsWith('Bütün yapı')).length} (aday ${wholes.length}); parça-bütün üst yapısı atanan kayıt: ${records.filter((r) => (r.parentIds ?? []).length > 0).length}.`)
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
