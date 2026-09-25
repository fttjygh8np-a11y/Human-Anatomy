/**
 * npm run report:inventory
 *
 * Whole-inventory matrix (system × top-level region) of every structure record, with separate
 * columns for 3D model, Latin/Turkish names, sourced description, relations and expert review.
 * Writes docs/raporlar/envanter.md (+ .json). Reads content/** and public/data/assets*.json
 * through the same pipeline as the content build. Counts are measured, never estimated.
 */
import { join, resolve } from 'node:path'
import { STRUCTURE_KINDS, SYSTEM_IDS, TOP_REGION_IDS, type Structure } from '../../src/core/schema.ts'
import { STRUCTURE_KIND_LABEL } from '../../src/i18n/labels.ts'
import { REPO_ROOT, argValue, prettyJson, repoRelative, writeText } from '../content/lib/io.ts'
import { buildTimestamp, contentVersionOf } from '../content/lib/manifest.ts'
import { loadContent, pathsFromArgs } from '../content/lib/pipeline.ts'

const COLS = ['total', 'model', 'la', 'tr', 'content', 'relations', 'approved'] as const
type Col = (typeof COLS)[number]
const COL_LABEL: Record<Col, string> = {
  total: 'Yapı kaydı',
  model: '3B model (anatomik)',
  la: 'Latince ad',
  tr: 'Türkçe ad',
  content: 'Kaynaklı açıklama',
  relations: 'En az 1 ilişki',
  approved: 'Uzman onaylı',
}

async function main(): Promise<number> {
  const reportDir = resolve(argValue('--report-dir') ?? join(REPO_ROOT, 'docs', 'raporlar'))
  const { content, inputs } = await loadContent(pathsFromArgs())

  // Structures with their own anatomical model nodes; generic concepts count through their instances.
  const own = new Set<string>()
  for (const a of content.assets) if (a.representation === 'anatomical') for (const n of a.nodes) own.add(n.structureId)
  const hasModel = (s: Structure) => own.has(s.id) || content.structures.some((x) => x.genericId === s.id && own.has(x.id))
  const withRelation = new Set(content.relations.flatMap((r) => [r.from, r.to]))
  const topOf = new Map<string, string>()
  for (const r of content.regions) {
    let cur = r
    while (cur.parentId) cur = content.regions.find((x) => x.id === cur.parentId) ?? cur
    topOf.set(r.id, cur.id)
  }
  const regionOf = (s: Structure) => {
    const tops = [...new Set(s.regions.map((r) => topOf.get(r) ?? r))]
    return tops.length === 1 ? tops[0]! : tops.length > 1 ? 'multiple' : 'unassigned'
  }
  const approved = (s: Structure) => s.review.text === 'approved' && s.review.labels === 'approved' && s.review.geometry === 'approved'
  const flags = (s: Structure): Record<Col, boolean> => ({
    total: true,
    model: hasModel(s),
    la: !!s.names.la,
    tr: !!s.names.tr,
    content: Object.values(s.content).some((f) => f?.status === 'present'),
    relations: withRelation.has(s.id) || s.parentIds.length > 0,
    approved: approved(s),
  })

  const regions = [...TOP_REGION_IDS, 'multiple', 'unassigned'] as string[]
  const cell = () => Object.fromEntries(COLS.map((c) => [c, 0])) as Record<Col, number>
  const matrix: Record<string, Record<string, Record<Col, number>>> = {}
  const bySystem: Record<string, Record<Col, number>> = {}
  const totals = cell()
  for (const s of content.structures) {
    const sys = s.systems[0]!
    const reg = regionOf(s)
    const f = flags(s)
    matrix[sys] ??= {}
    matrix[sys][reg] ??= cell()
    bySystem[sys] ??= cell()
    for (const c of COLS) {
      if (!f[c]) continue
      matrix[sys][reg][c]++
      bySystem[sys][c]++
      totals[c]++
    }
  }
  const systemName = (id: string) => content.systems.find((s) => s.id === id)?.name.tr ?? id
  const regionName = (id: string) =>
    id === 'multiple' ? 'Birden çok bölge' : id === 'unassigned' ? 'Bölgesi atanmamış' : (content.regions.find((r) => r.id === id)?.name.tr ?? id)

  const L: string[] = []
  const pct = (n: number, d: number) => (d === 0 ? '—' : `${n} (%${((100 * n) / d).toFixed(0)})`)
  L.push('# Yapı envanteri: sistem × bölge', '')
  L.push(`Oluşturma: ${buildTimestamp()} · içerik sürümü \`${contentVersionOf(inputs)}\` · \`npm run report:inventory\``, '')
  L.push(
    '> Bu tablo, içerikteki **her yapı kaydını** (BodyParts3D envanteri, HRA kadın üreme yapıları ve',
    '> genel/taraf belirtmeyen kavramlar) sayar. "Uzman onaylı" sütunu yalnızca adı belirtilmiş bir',
    '> anatomi uzmanının inceleme kaydıyla dolar; şu an hiçbir kayıt uzman incelemesinden geçmemiştir.',
    '> Adlar ve açıklamalar kaynaklıdır ama **doğrulanmamıştır**. Bir yapının tamamlanmış sayılma',
    '> koşulları için `docs/raporlar/kapsam.md`.',
    '',
  )
  L.push('## Toplam', '')
  L.push(`| ${COLS.map((c) => COL_LABEL[c]).join(' | ')} |`, `| ${COLS.map(() => '---').join(' | ')} |`)
  L.push(`| ${COLS.map((c) => (c === 'total' ? String(totals.total) : pct(totals[c], totals.total))).join(' | ')} |`, '')
  L.push('## Sistemlere göre', '')
  L.push(`| Sistem | ${COLS.map((c) => COL_LABEL[c]).join(' | ')} |`, `| --- | ${COLS.map(() => '---').join(' | ')} |`)
  for (const sys of SYSTEM_IDS) {
    const c = bySystem[sys] ?? cell()
    L.push(`| ${systemName(sys)} | ${COLS.map((k) => (k === 'total' ? String(c.total) : pct(c[k], c.total))).join(' | ')} |`)
  }
  L.push('', '## Sistem × bölge (yapı kaydı / 3B modelli / kaynaklı açıklamalı)', '')
  L.push(`| Sistem | ${regions.map(regionName).join(' | ')} |`, `| --- | ${regions.map(() => '---').join(' | ')} |`)
  for (const sys of SYSTEM_IDS) {
    const row = regions.map((r) => {
      const c = matrix[sys]?.[r]
      return c ? `${c.total} / ${c.model} / ${c.content}` : '—'
    })
    L.push(`| ${systemName(sys)} | ${row.join(' | ')} |`)
  }
  L.push('', 'Hücre biçimi: yapı kaydı / anatomik 3B modeli olan / kaynaklı açıklaması olan. "—": kayıt yok.', '')
  L.push('## Yapı türlerine göre', '')
  L.push(
    'Gereksinimlerde (§2) sayılan yapı türleri. Envanter, 3B model kütüphanelerindeki (BodyParts3D, HRA) öğelerden',
    'türetildiği için **modeli bulunmayan yapı türleri envanterde hiç yer almaz**; 0 olan satırlar bu eksikliği gösterir.',
    '',
  )
  const kindCount = new Map<string, number>()
  for (const s of content.structures) kindCount.set(s.kind, (kindCount.get(s.kind) ?? 0) + 1)
  L.push('| Yapı türü | Kayıt |', '| --- | --- |')
  for (const k of STRUCTURE_KINDS) L.push(`| ${STRUCTURE_KIND_LABEL[k]} | ${kindCount.get(k) ?? 0} |`)
  L.push('', `Bu türle sınıflandırılmış kaydı olmayan türler (bir kısmı otomatik sınıflandırma nedeniyle "Diğer" altında olabilir): ${STRUCTURE_KINDS.filter((k) => !kindCount.get(k)).map((k) => STRUCTURE_KIND_LABEL[k]).join(', ')}.`, '')
  L.push('Not: Tür, İngilizce addan otomatik türetildiği için "Diğer" satırı bazı organ ve damar kayıtlarını da içerir.', '')
  L.push('## Kayıt bulunmayan ya da çok az olan alanlar', '')
  for (const sys of SYSTEM_IDS) {
    const c = bySystem[sys] ?? cell()
    if (c.total < 10) L.push(`- **${systemName(sys)}:** ${c.total} yapı kaydı. Kullanılan model kütüphanelerinde (BodyParts3D, HRA) bu sistemin yapıları sınırlı; eksik yapılar için bu çalışmada başka uygun lisanslı model bulunamadı (eksik içerik).`)
  }
  L.push('')

  await writeText(join(reportDir, 'envanter.md'), L.join('\n'))
  await writeText(join(reportDir, 'envanter.json'), prettyJson({ generatedAt: buildTimestamp(), totals, bySystem, matrix }))
  console.log(`Envanter raporu yazıldı → ${repoRelative(join(reportDir, 'envanter.md'))}: ${totals.total} yapı, ${totals.model} modelli, ${totals.content} açıklamalı, ${totals.approved} uzman onaylı.`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Envanter raporu beklenmeyen bir hatayla durdu:', e)
    process.exitCode = 1
  },
)
