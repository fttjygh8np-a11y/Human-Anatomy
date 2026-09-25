/**
 * npm run report:release — measures the v1.0 release gates (plan: docs/durum.md, "Sürüm kapıları")
 * on the Dönem 1–2 scope targets and writes docs/raporlar/surum-kapilari.md (+ .json).
 *
 * Automated measurement only: gates that need people (expert review, real-device FPS, pilot) are
 * reported as open until their evidence exists in the repository. Nothing here replaces review.
 */
import { join, resolve } from 'node:path'
import { summarize } from '../content/lib/issues.ts'
import { REPO_ROOT, argValue, prettyJson, repoRelative, writeText } from '../content/lib/io.ts'
import { buildTimestamp, contentVersionOf } from '../content/lib/manifest.ts'
import { loadContent, pathsFromArgs } from '../content/lib/pipeline.ts'
import { computeCoverage, requiredFields } from './lib/coverage.ts'

const IUC = /^src:iuc-/
type Status = 'ok' | 'partial' | 'open'
interface Gate {
  no: number
  name: string
  target: string
  measured: string
  status: Status
}

const pct = (n: number, d: number) => (d === 0 ? '—' : `${n}/${d} (%${Math.round((100 * n) / d)})`)
const statusOf = (ratio: number, goal: number): Status => (ratio >= goal ? 'ok' : ratio > 0 ? 'partial' : 'open')
const ICON: Record<Status, string> = { ok: '✅', partial: '🟡', open: '❌' }

async function main(): Promise<number> {
  const reportDir = resolve(argValue('--report-dir') ?? join(REPO_ROOT, 'docs', 'raporlar'))
  const { content, issues, inputs } = await loadContent(pathsFromArgs())
  const cov = computeCoverage(content, { generatedAt: buildTimestamp(), contentVersion: contentVersionOf(inputs), automated: summarize(issues) })
  const byId = new Map(content.structures.map((s) => [s.id, s]))
  const targets = cov.targets.filter((t) => t.structureId && byId.has(t.structureId))
  const N = targets.length
  const structs = targets.map((t) => byId.get(t.structureId!)!)

  const withModel = targets.filter((t) => t.model === 'complete').length
  const withLa = structs.filter((s) => s.names.la).length
  const withTr = structs.filter((s) => s.names.tr).length
  const trFromBook = structs.filter((s) => s.names.tr?.sources.some((r) => IUC.test(r.sourceId) && r.quote)).length
  const englishOnly = structs.filter((s) => !s.names.tr && !s.names.la).length
  const contentDone = structs.filter((s) => requiredFields(s.kind).every((f) => s.content[f]?.status === 'present' || s.content[f]?.status === 'not_applicable')).length
  const contentFromBook = structs.filter((s) =>
    Object.values(s.content).some((f) => f?.status === 'present' && f.sources.some((r) => IUC.test(r.sourceId) && r.quote)),
  ).length
  const relIds = new Set(content.relations.filter((r) => r.type !== 'part_of').flatMap((r) => [r.from, r.to]))
  const withRelation = structs.filter((s) => relIds.has(s.id) || (s.genericId && relIds.has(s.genericId))).length
  const sectionQuestions = content.questions.filter((q) => q.type === 'section').length
  const questionTargets = new Map<string, number>()
  for (const q of content.questions) for (const id of [q.target, ...q.requiresVisible].filter((x): x is string => !!x)) questionTargets.set(id, (questionTargets.get(id) ?? 0) + 1)
  const inTwoQuestions = structs.filter((s) => (questionTargets.get(s.id) ?? 0) >= 2).length
  const usedSources = new Set<string>()
  for (const s of content.structures) for (const n of Object.values(s.names)) for (const r of n?.sources ?? []) usedSources.add(r.sourceId)
  for (const a of content.assets) usedSources.add(a.sourceId)
  const unverifiedLicenses = content.sources.filter((s) => usedSources.has(s.id) && !s.license.verifiedAt).map((s) => s.shortLabel)
  const approved = content.reviews.filter((r) => r.status === 'approved').length

  const gates: Gate[] = [
    { no: 1, name: 'Kapsam', target: 'Dönem 1–2 hedeflerinin tamamı kapsam matrisinde ve envanterde', measured: `${N} hedef yapı (kitaplarda geçen, bölgesi atanmış); bölgesi olmayanlar: docs/raporlar/iuc-kapsam-disi.md`, status: N > 0 ? 'partial' : 'open' },
    { no: 2, name: '3B model', target: '≥ %90 anatomik model', measured: pct(withModel, N), status: statusOf(withModel / Math.max(N, 1), 0.9) },
    { no: 3, name: 'Adlar', target: 'LA %100; TR kitapta varsa kitaptan; ekranda yalnız İngilizce ad yok', measured: `LA ${pct(withLa, N)} · TR ${pct(withTr, N)} (kitaptan alıntılı ${trFromBook}) · yalnız İngilizce ${englishOnly}`, status: withLa === N && englishOnly === 0 ? 'ok' : 'partial' },
    { no: 4, name: 'Bilgi kartı', target: 'Zorunlu alanlar %100, kitaptan alıntılı', measured: `${pct(contentDone, N)} tamam · kitaptan alıntılı alanı olan ${contentFromBook}`, status: statusOf(contentDone / Math.max(N, 1), 1) },
    { no: 5, name: 'İlişkiler', target: 'Kitapta geçen sinir/arter/ven ilişkileri kayıtlı', measured: `En az bir ilişkisi olan hedef: ${pct(withRelation, N)}`, status: statusOf(withRelation / Math.max(N, 1), 0.9) },
    { no: 6, name: 'Öğrenme', target: 'Her kitap bölümüne ders; her hedef ≥ 2 soruda; bölge başına kesit sorusu', measured: `Ders ${content.lessons.length} · yazılı soru ${content.questions.length} · kesit sorusu ${sectionQuestions} · ≥2 yazılı soruda geçen hedef ${pct(inTwoQuestions, N)}`, status: content.lessons.length > 0 ? 'partial' : 'open' },
    { no: 7, name: 'Teknik', target: 'Üç tarayıcıda e2e/axe yeşil; gerçek cihazda ≥ 30 FPS; PWA', measured: 'CI: yalnız Chromium. Gerçek cihaz FPS ölçülmedi. PWA yok (docs/raporlar/performans.md).', status: 'partial' },
    { no: 8, name: 'Yasal', target: 'Kullanılan kaynakların lisansı birincil kaynaktan doğrulanmış; uygulamada atıf ve uyarı', measured: unverifiedLicenses.length ? `Lisansı doğrulanmamış kullanılan kaynak: ${unverifiedLicenses.join(', ')}` : 'Tüm kullanılan kaynaklar doğrulandı', status: unverifiedLicenses.length ? 'partial' : 'ok' },
    { no: 9, name: 'Uzman', target: 'Onay yoksa açıkça gösterilir; inceleme ekranı hazır', measured: `Uzman onaylı inceleme kaydı: ${approved}. Uygulama "uzman onayından geçmemiştir" uyarısını gösteriyor.`, status: approved > 0 ? 'partial' : 'open' },
  ]

  const md = [
    '# v1.0 sürüm kapıları',
    '',
    `Oluşturma: ${cov.generatedAt} · içerik sürümü \`${cov.contentVersion}\` · \`npm run report:release\``,
    '',
    '> Otomatik ölçümdür. Uzman incelemesi, gerçek cihaz ölçümü ve pilot gibi insan gerektiren kapılar,',
    '> kanıtları depoya girene kadar açık görünür. Hedef yapılar: kapsam matrisindeki (İÜC Dönem 1–2 +',
    '> elle yazılmış) ve envanterde karşılığı olan yapılar.',
    '',
    '| # | Kapı | Hedef | Ölçülen | Durum |',
    '| --- | --- | --- | --- | --- |',
    ...gates.map((g) => `| ${g.no} | ${g.name} | ${g.target} | ${g.measured} | ${ICON[g.status]} |`),
    '',
  ].join('\n')
  await writeText(join(reportDir, 'surum-kapilari.md'), md)
  await writeText(join(reportDir, 'surum-kapilari.json'), prettyJson({ generatedAt: cov.generatedAt, contentVersion: cov.contentVersion, targets: N, gates }))
  console.log(`Sürüm kapıları → ${repoRelative(join(reportDir, 'surum-kapilari.md'))}`)
  for (const g of gates) console.log(`  ${ICON[g.status]} ${g.no}. ${g.name}: ${g.measured}`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('Sürüm kapıları ölçülemedi:', e)
    process.exitCode = 1
  },
)
