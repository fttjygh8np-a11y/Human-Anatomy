/**
 * Scope-matrix coverage (pure): scope targets × inventory × 3D models × names × content
 * fields × licenses × expert review, grouped per system, region and detail level.
 *
 * A target counts as complete only when every dimension is complete (docs/gereksinimler.md
 * §13). Schematic placeholder models never count as anatomical coverage (§4). Automated
 * checks are reported separately from human review (§13).
 */
import {
  DETAIL_LEVELS,
  SYSTEM_IDS,
  type DetailLevel,
  type Laterality,
  type ReviewStatus,
  type Structure,
  type StructureContentField,
  type StructureKind,
  type SystemId,
} from '../../../src/core/schema.ts'
import { REVIEW_STATUS_LABEL } from '../../../src/i18n/labels.ts'
import type { CompiledContent } from '../../content/lib/compile.ts'
import { scopeStructureId } from '../../content/lib/integrity.ts'

/** Content fields a structure needs before its info card counts as complete (editorial rule). */
export const REQUIRED_CONTENT_FIELDS: {
  base: readonly StructureContentField[]
  byKind: Partial<Record<StructureKind, readonly StructureContentField[]>>
} = {
  base: ['summary', 'description', 'location'],
  byKind: {
    muscle: ['origin', 'insertion', 'action'],
    joint: ['jointType', 'movements'],
  },
}

export const DIMENSIONS = ['inventory', 'model', 'labels', 'content', 'license', 'review', 'complete'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const DIMENSION_LABEL: Record<Dimension, string> = {
  inventory: 'Envanter kaydı',
  model: '3B anatomik model',
  labels: 'TR/LA/EN adlar',
  content: 'Bilgi kartı içeriği',
  license: 'Model lisansı doğrulanmış',
  review: 'Uzman incelemesi',
  complete: 'Tamamlanmış',
}

export type NameState = 'verified' | 'unverified' | 'missing'
export type ModelState = 'complete' | 'partial' | 'schematic_only' | 'none'
export type LicenseState = 'verified' | 'recorded' | 'missing' | 'no_model'
const ASPECTS = ['text', 'labels', 'geometry', 'relations'] as const

export interface TargetCoverage {
  targetId: string
  structureId: string | null
  name: string
  /** English target name (shown next to `name` when different). */
  nameEn: string
  system: SystemId
  systemLabel: string
  region: string
  regionLabel: string
  topRegion: string
  level: DetailLevel
  laterality: Laterality
  inventory: boolean
  model: ModelState
  /** For paired concepts: which sided instances have anatomical geometry. */
  modelSides: { right: boolean; left: boolean } | null
  names: Record<'tr' | 'la' | 'en', NameState>
  contentMissing: StructureContentField[]
  license: LicenseState
  review: Record<(typeof ASPECTS)[number], ReviewStatus | 'none'>
  done: Record<Dimension, boolean>
}

export interface CoverageCounts {
  total: number
  /** Complete targets per dimension. */
  done: Record<Dimension, number>
  /** Names present in all three languages (any verification state). */
  labelsPresent: number
}

export interface CoverageReport {
  generatedAt: string
  contentVersion: string
  totals: CoverageCounts
  bySystem: { key: SystemId; label: string; counts: CoverageCounts }[]
  byRegion: { key: string; label: string; counts: CoverageCounts }[]
  byLevel: { key: DetailLevel; label: string; counts: CoverageCounts }[]
  /** system -> top region -> counts (only non-empty cells). */
  matrix: { system: SystemId; region: string; counts: CoverageCounts }[]
  targets: TargetCoverage[]
  untargetedStructures: { total: number; bySystem: Partial<Record<SystemId, number>> }
  assets: { total: number; anatomical: number; schematic: number; nodes: number; orphanNodes: number; structuresWithModel: number }
  reviews: { total: number; byStatus: Partial<Record<ReviewStatus, number>>; byRole: Record<string, number> }
  automated: { errors: number; warnings: number }
}

function emptyCounts(): CoverageCounts {
  return { total: 0, done: Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<Dimension, number>, labelsPresent: 0 }
}

function add(c: CoverageCounts, t: TargetCoverage): void {
  c.total++
  for (const d of DIMENSIONS) if (t.done[d]) c.done[d]++
  if (t.names.tr !== 'missing' && t.names.la !== 'missing' && t.names.en !== 'missing') c.labelsPresent++
}

export function requiredFields(kind: StructureKind): StructureContentField[] {
  return [...REQUIRED_CONTENT_FIELDS.base, ...(REQUIRED_CONTENT_FIELDS.byKind[kind] ?? [])]
}

export function computeCoverage(
  c: CompiledContent,
  meta: { generatedAt: string; contentVersion: string; automated?: { errors: number; warnings: number } },
): CoverageReport {
  const structures = new Map(c.structures.map((s) => [s.id, s]))
  const sources = new Map(c.sources.map((s) => [s.id, s]))
  const regionName = new Map(c.regions.map((r) => [r.id, r.name.tr]))
  const systemName = new Map(c.systems.map((s) => [s.id, s.name.tr]))
  const regionParent = new Map(c.regions.map((r) => [r.id, r.parentId]))
  const topRegionOf = (id: string) => {
    let cur = id
    const seen = new Set<string>()
    while (regionParent.get(cur) && !seen.has(cur)) {
      seen.add(cur)
      cur = regionParent.get(cur)!
    }
    return cur
  }

  const children = new Map<string, Structure[]>()
  const instances = new Map<string, Structure[]>()
  for (const s of c.structures) {
    for (const p of s.parentIds) children.set(p, [...(children.get(p) ?? []), s])
    if (s.genericId) instances.set(s.genericId, [...(instances.get(s.genericId) ?? []), s])
  }
  /** Anatomical / schematic node presence and the asset sources per structure (own nodes only). */
  const own = new Map<string, { anatomical: boolean; schematic: boolean; sources: Set<string> }>()
  let orphanNodes = 0
  let nodes = 0
  for (const a of c.assets) {
    for (const n of a.nodes) {
      nodes++
      if (!structures.has(n.structureId)) orphanNodes++
      const e = own.get(n.structureId) ?? { anatomical: false, schematic: false, sources: new Set<string>() }
      if (a.representation === 'anatomical') e.anatomical = true
      else e.schematic = true
      e.sources.add(a.sourceId)
      own.set(n.structureId, e)
    }
  }
  /** Structure plus its part-of descendants. */
  const subtree = (id: string): string[] => {
    const out: string[] = []
    const seen = new Set<string>()
    const stack = [id]
    while (stack.length > 0) {
      const cur = stack.pop()!
      if (seen.has(cur)) continue
      seen.add(cur)
      out.push(cur)
      for (const ch of children.get(cur) ?? []) stack.push(ch.id)
    }
    return out
  }
  const geometry = (ids: readonly string[]) => {
    let anatomical = false
    let schematic = false
    const srcs = new Set<string>()
    for (const id of ids) {
      const e = own.get(id)
      if (!e) continue
      anatomical ||= e.anatomical
      schematic ||= e.schematic
      e.sources.forEach((x) => srcs.add(x))
    }
    return { anatomical, schematic, sources: srcs }
  }

  const targetStructureIds = new Set<string>()
  const targets: TargetCoverage[] = c.scope.map((t) => {
    const sid = scopeStructureId(t) ?? null
    const s = sid ? structures.get(sid) : undefined
    if (sid) targetStructureIds.add(sid)
    const names = {
      tr: s?.names.tr ? s.names.tr.status : 'missing',
      la: s?.names.la ? s.names.la.status : 'missing',
      en: s ? s.names.en.status : 'missing',
    } as Record<'tr' | 'la' | 'en', NameState>

    // Geometry: the structure's subtree; for paired concepts each sided instance separately.
    let model: ModelState = 'none'
    let modelSides: TargetCoverage['modelSides'] = null
    let modelSources = new Set<string>()
    const sided = s ? (instances.get(s.id) ?? []) : []
    if (s) {
      const self = geometry(subtree(s.id))
      modelSources = self.sources
      if (s.laterality === 'paired_generic' && sided.length > 0) {
        const side = (l: 'right' | 'left') => {
          const g = geometry(sided.filter((x) => x.laterality === l).flatMap((x) => subtree(x.id)))
          g.sources.forEach((x) => modelSources.add(x))
          return g
        }
        const r = side('right')
        const l = side('left')
        modelSides = { right: r.anatomical, left: l.anatomical }
        model = r.anatomical && l.anatomical ? 'complete' : r.anatomical || l.anatomical || self.anatomical ? 'partial' : r.schematic || l.schematic || self.schematic ? 'schematic_only' : 'none'
      } else {
        model = self.anatomical ? 'complete' : self.schematic ? 'schematic_only' : 'none'
      }
    }

    let license: LicenseState = 'no_model'
    if (modelSources.size > 0) {
      const list = [...modelSources].map((id) => sources.get(id))
      if (list.some((x) => !x || !x.license.allowsUse || !x.license.allowsModification || !x.license.allowsRedistribution)) license = 'missing'
      else license = list.every((x) => x!.license.verifiedAt) ? 'verified' : 'recorded'
    }

    const contentMissing = s
      ? requiredFields(s.kind).filter((f) => {
          const v = s.content[f]
          return !v || v.status === 'missing'
        })
      : requiredFields(t.kind)

    const review = Object.fromEntries(ASPECTS.map((a) => [a, s ? s.review[a] : 'none'])) as TargetCoverage['review']
    const instancesGeometryApproved = sided.every((x) => x.review.geometry === 'approved')
    const reviewDone = !!s && ASPECTS.every((a) => s.review[a] === 'approved') && instancesGeometryApproved

    const done: Record<Dimension, boolean> = {
      inventory: !!s,
      model: model === 'complete',
      labels: names.tr === 'verified' && names.la === 'verified' && names.en === 'verified',
      content: !!s && contentMissing.length === 0,
      license: license === 'verified',
      review: reviewDone,
      complete: false,
    }
    done.complete = DIMENSIONS.filter((d) => d !== 'complete').every((d) => done[d])

    return {
      targetId: t.id,
      structureId: sid,
      name: t.name.tr ?? t.name.la ?? t.name.en,
      nameEn: t.name.en,
      system: t.system,
      systemLabel: systemName.get(t.system) ?? t.system,
      region: t.region,
      regionLabel: regionName.get(t.region) ?? t.region,
      topRegion: topRegionOf(t.region),
      level: t.level,
      laterality: t.laterality,
      inventory: !!s,
      model,
      modelSides,
      names,
      contentMissing,
      license,
      review,
      done,
    }
  })

  const totals = emptyCounts()
  const bySystem = new Map<SystemId, CoverageCounts>()
  const byRegion = new Map<string, CoverageCounts>()
  const byLevel = new Map<DetailLevel, CoverageCounts>()
  const matrix = new Map<string, { system: SystemId; region: string; counts: CoverageCounts }>()
  const bump = <K>(m: Map<K, CoverageCounts>, k: K, t: TargetCoverage) => {
    const cur = m.get(k) ?? emptyCounts()
    add(cur, t)
    m.set(k, cur)
  }
  for (const t of targets) {
    add(totals, t)
    bump(bySystem, t.system, t)
    bump(byRegion, t.topRegion, t)
    bump(byLevel, t.level, t)
    const key = `${t.system}\u0000${t.topRegion}`
    const cell = matrix.get(key) ?? { system: t.system, region: t.topRegion, counts: emptyCounts() }
    add(cell.counts, t)
    matrix.set(key, cell)
  }

  const regionOrder = c.regions.filter((r) => !r.parentId).map((r) => r.id)
  const untargeted = c.structures.filter((s) => !targetStructureIds.has(s.id) && !(s.genericId && targetStructureIds.has(s.genericId)))
  const untargetedBySystem: Partial<Record<SystemId, number>> = {}
  for (const s of untargeted) untargetedBySystem[s.systems[0]!] = (untargetedBySystem[s.systems[0]!] ?? 0) + 1

  const byStatus: Partial<Record<ReviewStatus, number>> = {}
  const byRole: Record<string, number> = {}
  for (const r of c.reviews) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    const role = r.reviewer?.role ?? 'belirtilmemiş'
    byRole[role] = (byRole[role] ?? 0) + 1
  }

  return {
    generatedAt: meta.generatedAt,
    contentVersion: meta.contentVersion,
    totals,
    bySystem: SYSTEM_IDS.filter((s) => bySystem.has(s)).map((s) => ({ key: s, label: systemName.get(s) ?? s, counts: bySystem.get(s)! })),
    byRegion: [...byRegion.keys()]
      .sort((a, b) => regionOrder.indexOf(a) - regionOrder.indexOf(b))
      .map((r) => ({ key: r, label: regionName.get(r) ?? r, counts: byRegion.get(r)! })),
    byLevel: DETAIL_LEVELS.filter((l) => byLevel.has(l)).map((l) => ({ key: l, label: l, counts: byLevel.get(l)! })),
    matrix: [...matrix.values()],
    targets,
    untargetedStructures: { total: untargeted.length, bySystem: untargetedBySystem },
    assets: {
      total: c.assets.length,
      anatomical: c.assets.filter((a) => a.representation === 'anatomical').length,
      schematic: c.assets.filter((a) => a.representation === 'schematic').length,
      nodes,
      orphanNodes,
      structuresWithModel: [...own.keys()].filter((id) => structures.has(id)).length,
    },
    reviews: { total: c.reviews.length, byStatus, byRole },
    automated: meta.automated ?? { errors: 0, warnings: 0 },
  }
}

// ---------------------------------------------------------------------------
// Markdown (Turkish)
// ---------------------------------------------------------------------------

const LEVEL_TR: Record<DetailLevel, string> = { basic: 'Temel', intermediate: 'Orta', advanced: 'İleri' }
const MODEL_TR: Record<ModelState, string> = { complete: 'var', partial: 'kısmi', schematic_only: 'yalnız şematik', none: 'yok' }
const LICENSE_TR: Record<LicenseState, string> = { verified: 'doğrulanmış', recorded: 'kayıtlı, doğrulanmamış', missing: 'eksik/yetersiz', no_model: '—' }
const NAME_TR: Record<NameState, string> = { verified: '✓', unverified: '?', missing: '—' }

function pct(n: number, total: number): string {
  if (total === 0) return '—'
  return `${n}/${total} (%${Math.round((n / total) * 100)})`
}

function countsRow(label: string, c: CoverageCounts): string {
  return `| ${label} | ${c.total} | ${DIMENSIONS.map((d) => pct(c.done[d], c.total)).join(' | ')} |`
}

function countsTable(firstCol: string, rows: { label: string; counts: CoverageCounts }[]): string[] {
  return [
    `| ${firstCol} | Hedef | ${DIMENSIONS.map((d) => DIMENSION_LABEL[d]).join(' | ')} |`,
    `|---|---:|${DIMENSIONS.map(() => '---:').join('|')}|`,
    ...rows.map((r) => countsRow(r.label, r.counts)),
  ]
}

export function renderCoverageMarkdown(r: CoverageReport, opts: { targetLimit?: number } = {}): string {
  const limit = opts.targetLimit ?? 400
  const L: string[] = []
  L.push('# Kapsam raporu')
  L.push('')
  L.push(`> Otomatik üretildi: \`npm run report:coverage\` · içerik sürümü \`${r.contentVersion}\` · ${r.generatedAt.slice(0, 10)}.`)
  L.push('> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca')
  L.push('> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.')
  L.push('')
  L.push('## Özet')
  L.push('')
  L.push(`Kapsam matrisindeki toplam hedef yapı: **${r.totals.total}**. Tamamlanmış: **${pct(r.totals.done.complete, r.totals.total)}**.`)
  L.push('')
  L.push('| Boyut | Tamamlanan |')
  L.push('|---|---:|')
  for (const d of DIMENSIONS) L.push(`| ${DIMENSION_LABEL[d]} | ${pct(r.totals.done[d], r.totals.total)} |`)
  L.push(`| _Adlar üç dilde mevcut (doğrulanmamış dahil)_ | ${pct(r.totals.labelsPresent, r.totals.total)} |`)
  L.push('')
  L.push('Boyutların tanımı:')
  L.push('')
  L.push('- **Envanter kaydı:** hedef, `content/` içindeki bir yapı kaydına bağlı (`structureId`).')
  L.push('- **3B anatomik model:** yapının (veya parça-bütün alt yapılarının) anatomik veriden türetilmiş model düğümü var; çift yapılarda sağ ve sol örneklerin ikisi de. Şematik geçici modeller sayılmaz.')
  L.push('- **TR/LA/EN adlar:** üç dildeki ad da kaynağıyla "doğrulandı" durumunda.')
  L.push(`- **Bilgi kartı içeriği:** zorunlu alanlar (${REQUIRED_CONTENT_FIELDS.base.join(', ')}; kaslarda ayrıca origin/insertion/action, eklemlerde jointType/movements) mevcut ya da "uygulanamaz" olarak işaretli.`)
  L.push('- **Model lisansı doğrulanmış:** modelin kaynak kayıtlarında kullanım, değiştirme ve dağıtım izni var ve lisans birincil kaynaktan tarihli olarak doğrulanmış (`license.verifiedAt`).')
  L.push('- **Uzman incelemesi:** metin, etiket, geometri ve ilişki boyutlarının dördü de anatomi uzmanı kaydıyla "Yayına onaylı".')
  L.push('- **Tamamlanmış:** yukarıdaki boyutların tümü.')
  L.push('')
  L.push('## Sisteme göre')
  L.push('')
  L.push(...(r.bySystem.length > 0 ? countsTable('Sistem', r.bySystem) : ['Henüz kapsam hedefi yok.']))
  L.push('')
  L.push('## Bölgeye göre (üst düzey bölge)')
  L.push('')
  L.push(...(r.byRegion.length > 0 ? countsTable('Bölge', r.byRegion) : ['Henüz kapsam hedefi yok.']))
  L.push('')
  L.push('## Ayrıntı düzeyine göre')
  L.push('')
  L.push(...(r.byLevel.length > 0 ? countsTable('Düzey', r.byLevel.map((x) => ({ label: LEVEL_TR[x.key], counts: x.counts }))) : ['Henüz kapsam hedefi yok.']))
  L.push('')
  L.push('## Sistem × bölge matrisi (tamamlanan / hedef)')
  L.push('')
  const regions = r.byRegion.map((x) => x.key)
  if (r.matrix.length === 0) L.push('Henüz kapsam hedefi yok.')
  else {
    L.push(`| Sistem | ${r.byRegion.map((x) => x.label).join(' | ')} |`)
    L.push(`|---|${regions.map(() => '---:').join('|')}|`)
    for (const s of r.bySystem) {
      const cells = regions.map((reg) => {
        const cell = r.matrix.find((m) => m.system === s.key && m.region === reg)
        return cell ? `${cell.counts.done.complete}/${cell.counts.total}` : '·'
      })
      L.push(`| ${s.label} | ${cells.join(' | ')} |`)
    }
  }
  L.push('')
  L.push('## Hedef yapılar')
  L.push('')
  L.push('Ad sütunları: ✓ doğrulandı · ? doğrulanmadı · — yok. İnceleme: metin/etiket/geometri/ilişki.')
  L.push('')
  L.push('| Hedef | Sistem | Bölge | Düzey | Envanter | Model | TR | LA | EN | Eksik içerik | Lisans | İnceleme |')
  L.push('|---|---|---|---|---|---|:-:|:-:|:-:|---|---|---|')
  for (const t of r.targets.slice(0, limit)) {
    const sides = t.modelSides ? ` (sağ ${t.modelSides.right ? '✓' : '—'}, sol ${t.modelSides.left ? '✓' : '—'})` : ''
    const name = t.name === t.nameEn ? t.name : `${t.name} (${t.nameEn})`
    const review = t.inventory ? ASPECTS.map((a) => (t.review[a] === 'none' ? '—' : REVIEW_STATUS_LABEL[t.review[a] as ReviewStatus])).join(' / ') : '—'
    L.push(
      `| ${name} | ${t.systemLabel} | ${t.regionLabel} | ${LEVEL_TR[t.level]} | ${t.inventory ? `\`${t.structureId}\`` : 'yok'} | ${MODEL_TR[t.model]}${sides} | ` +
        `${NAME_TR[t.names.tr]} | ${NAME_TR[t.names.la]} | ${NAME_TR[t.names.en]} | ${t.contentMissing.length > 0 ? t.contentMissing.join(', ') : '—'} | ` +
        `${LICENSE_TR[t.license]} | ${review} |`,
    )
  }
  if (r.targets.length > limit) L.push(`\n… ve ${r.targets.length - limit} hedef daha (tam liste: kapsam.json).`)
  L.push('')
  L.push('## Kapsam hedefi olmayan yapılar')
  L.push('')
  const unt = Object.entries(r.untargetedStructures.bySystem)
  L.push(
    r.untargetedStructures.total === 0
      ? 'Yok.'
      : `${r.untargetedStructures.total} yapı kaydı henüz bir kapsam hedefine bağlı değil (${unt.map(([s, n]) => `${s}: ${n}`).join(', ')}). Bunlar tamamlanma oranına katılmaz.`,
  )
  L.push('')
  L.push('## 3B model varlıkları')
  L.push('')
  L.push(
    `${r.assets.total} varlık (${r.assets.anatomical} anatomik, ${r.assets.schematic} şematik), ${r.assets.nodes} düğüm; ` +
      `modeli olan yapı: ${r.assets.structuresWithModel}; envanterde karşılığı olmayan düğüm: ${r.assets.orphanNodes}.`,
  )
  L.push('')
  L.push('## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)')
  L.push('')
  const st = Object.entries(r.reviews.byStatus)
  const roles = Object.entries(r.reviews.byRole)
  L.push(
    `- **İnsan inceleme kayıtları:** ${r.reviews.total}` +
      (r.reviews.total > 0 ? ` (durum: ${st.map(([k, n]) => `${k} ${n}`).join(', ')}; rol: ${roles.map(([k, n]) => `${k} ${n}`).join(', ')})` : ' — henüz hiçbir içerik anatomi uzmanınca incelenmedi.'),
  )
  L.push(`- **Otomatik doğrulama (npm run content:validate):** ${r.automated.errors} hata, ${r.automated.warnings} uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.`)
  L.push('')
  return L.join('\n')
}
