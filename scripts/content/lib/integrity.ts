/**
 * Referential and editorial integrity checks over compiled content (pure).
 *
 * Covers: references (parents, counterparts, generic concepts, relation endpoints, sources,
 * regions, assets, review targets), part-of cycles, laterality consistency (incl. model
 * centroids of right/left pairs), verification states vs. review records, reviewer rules,
 * duplicate names, orphan model nodes and license permissions of model sources.
 *
 * Automated checks never substitute for expert review: they only verify that claimed
 * states are backed by the records that must exist for them.
 */
import {
  LANGS,
  STRUCTURE_CONTENT_FIELDS,
  SYSTEM_IDS,
  TOP_REGION_IDS,
  type Laterality,
  type RelationType,
  type ReviewAspect,
  type ReviewRecord,
  type ReviewStatus,
  type SourceRef,
} from '../../../src/core/schema.ts'
import { originOf, type CompiledContent, type RecordKind } from './compile.ts'
import { error, warning, type Issue, type IssueCode } from './issues.ts'
import { taxonNameEntries } from './taxonomy.ts'

/** Source types that name or represent structures but are not enough on their own for explanatory text. */
export const WEAK_TEXT_SOURCE_TYPES = new Set(['terminology', 'ontology', 'model_library', 'dataset'])

/** Relations that should never connect a right instance with a left instance. */
export const SIDE_BOUND_RELATIONS = new Set<RelationType>([
  'part_of',
  'branch_of',
  'tributary_of',
  'arterial_supply',
  'venous_drainage',
  'innervated_by',
  'origin_on',
  'insertion_on',
  'located_in_compartment',
  'member_of_group',
  'acts_on_joint',
  'attaches_to',
])

const REVIEW_ASPECTS_BY_TARGET: Record<ReviewRecord['target']['type'], readonly ReviewAspect[]> = {
  structure: ['text', 'labels', 'geometry', 'relations'],
  relation: ['relations'],
  asset: ['geometry'],
  question: ['question'],
  lesson: ['lesson'],
}

const LANG_LABEL = { tr: 'Türkçe', la: 'Latince', en: 'İngilizce' } as const

const isSided = (l: Laterality): l is 'right' | 'left' => l === 'right' || l === 'left'
const opposite = (a: Laterality, b: Laterality) => isSided(a) && isSided(b) && a !== b
const sideTr = (l: Laterality) => (l === 'right' ? 'sağ' : l === 'left' ? 'sol' : l)

export function normalizeName(value: string, lang: 'tr' | 'la' | 'en'): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Canonical rotation so each cycle is reported once. */
function cycleKey(cycle: string[]): string {
  let best = 0
  for (let i = 1; i < cycle.length; i++) if (cycle[i]! < cycle[best]!) best = i
  return [...cycle.slice(best), ...cycle.slice(0, best)].join('>')
}

/** Cycles in a directed graph (iterative DFS). Edges to unknown nodes are ignored. */
export function findCycles(nodes: readonly string[], edges: ReadonlyMap<string, readonly string[]>): string[][] {
  const known = new Set(nodes)
  const color = new Map<string, 1 | 2>()
  const cycles: string[][] = []
  const seen = new Set<string>()
  for (const start of nodes) {
    if (color.has(start)) continue
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }]
    const path: string[] = [start]
    color.set(start, 1)
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!
      const next = (edges.get(top.id) ?? []).filter((n) => known.has(n))
      if (top.i < next.length) {
        const n = next[top.i++]!
        const c = color.get(n)
        if (c === undefined) {
          color.set(n, 1)
          stack.push({ id: n, i: 0 })
          path.push(n)
        } else if (c === 1) {
          const cycle = path.slice(path.indexOf(n))
          const key = cycleKey(cycle)
          if (!seen.has(key)) {
            seen.add(key)
            cycles.push(cycle)
          }
        }
      } else {
        color.set(top.id, 2)
        stack.pop()
        path.pop()
      }
    }
  }
  return cycles
}

export function checkIntegrity(c: CompiledContent): Issue[] {
  const issues: Issue[] = []
  const at = (kind: RecordKind, id: string) => ({ file: originOf(c, kind, id), recordId: id })
  const push = (sev: 'error' | 'warning', code: IssueCode, msg: string, kind: RecordKind, id: string) =>
    issues.push(sev === 'error' ? error(code, msg, at(kind, id)) : warning(code, msg, at(kind, id)))

  const structures = new Map(c.structures.map((s) => [s.id, s]))
  const sources = new Map(c.sources.map((s) => [s.id, s]))
  const regions = new Map(c.regions.map((r) => [r.id, r]))
  const assets = new Map(c.assets.map((a) => [a.id, a]))
  const relations = new Map(c.relations.map((r) => [r.id, r]))
  const lessons = new Map(c.lessons.map((l) => [l.id, l]))
  const questions = new Map(c.questions.map((q) => [q.id, q]))

  const checkRefs = (refs: readonly SourceRef[], context: string, kind: RecordKind, id: string) => {
    for (const ref of refs) {
      if (!sources.has(ref.sourceId)) push('error', 'missing_source', `${context}: tanımsız kaynak "${ref.sourceId}".`, kind, id)
    }
  }
  const hasLocator = (refs: readonly SourceRef[]) => refs.some((r) => (r.locator ?? '').trim().length > 0)

  // Review records (indexed; validated below) ---------------------------------
  const reviewIndex = new Map<string, ReviewRecord[]>()
  c.reviews.forEach((r) => {
    const key = `${r.target.type}\u0000${r.target.id}\u0000${r.aspect}`
    const list = reviewIndex.get(key)
    if (list) list.push(r)
    else reviewIndex.set(key, [r])
  })
  /** Latest record for target+aspect; same-date records: the later one in the files wins. */
  const latestReview = (type: ReviewRecord['target']['type'], id: string, aspect: ReviewAspect): ReviewRecord | undefined => {
    const list = reviewIndex.get(`${type}\u0000${id}\u0000${aspect}`)
    if (!list || list.length === 0) return undefined
    let best = list[0]!
    for (const r of list) if (r.date >= best.date) best = r
    return best
  }
  const expertApproved = (type: ReviewRecord['target']['type'], id: string, aspect: ReviewAspect) => {
    const r = latestReview(type, id, aspect)
    return !!r && r.status === 'approved' && r.reviewer?.role === 'anatomy_expert'
  }
  const reviewedTargets = new Set(c.reviews.map((r) => `${r.target.type}\u0000${r.target.id}`))
  const TARGET_KIND: Record<ReviewRecord['target']['type'], RecordKind> = { structure: 'structure', relation: 'relation', asset: 'asset', question: 'question', lesson: 'lesson' }
  /** A review state on a record must be backed by the latest review record for that target and aspect. */
  const checkReviewState = (type: ReviewRecord['target']['type'], id: string, aspect: ReviewAspect, state: ReviewStatus, label: string) => {
    const kind = TARGET_KIND[type]
    const latest = latestReview(type, id, aspect)
    if (state === 'approved' && !expertApproved(type, id, aspect))
      push('error', 'expert_approval_without_review', `${label} "Yayına onaylı" ama anatomi uzmanının en güncel "${aspect}" onay kaydı yok.`, kind, id)
    else if (state === 'needs_revision' && !latest)
      push('error', 'review_state_mismatch', `${label} "Düzeltme gerekli" ama bunu kaydeden, incelemecisi belirtilmiş inceleme kaydı yok.`, kind, id)
    else if (latest && latest.status !== state)
      push('warning', 'review_state_mismatch', `${label} durumu (${state}) en güncel inceleme kaydıyla (${latest.id}: ${latest.status}) uyuşmuyor.`, kind, id)
  }

  // Taxonomy ------------------------------------------------------------------
  const systemIds = new Set(c.systems.map((s) => s.id))
  for (const id of SYSTEM_IDS) {
    if (!systemIds.has(id)) issues.push(warning('missing_system_record', `"${id}" sistemi için taksonomi kaydı (ad, renk, katman sırası) yok.`, { file: 'content/taxonomy/systems.json' }))
  }
  const taxonNames = [
    ...c.authoredSystems.map((s) => ({ kind: 'system' as const, id: s.id, names: s.names })),
    ...c.authoredRegions.map((r) => ({ kind: 'region' as const, id: r.id, names: r.names })),
  ]
  for (const t of taxonNames) {
    for (const { lang, entry } of taxonNameEntries(t.names)) {
      if (entry.status === 'verified' && entry.sources.length === 0)
        push('error', 'verified_without_source', `${LANG_LABEL[lang]} ad "doğrulandı" olarak işaretli ama kaynak gösterilmemiş.`, t.kind, t.id)
      checkRefs(entry.sources, `${LANG_LABEL[lang]} ad`, t.kind, t.id)
    }
  }
  for (const r of c.regions) {
    if (r.parentId !== undefined) {
      if (r.parentId === r.id) push('error', 'region_tree', 'Bölge kendi üst bölgesi olamaz.', 'region', r.id)
      else if (!regions.has(r.parentId)) push('error', 'region_tree', `Üst bölge "${r.parentId}" tanımlı değil.`, 'region', r.id)
    } else if (!(TOP_REGION_IDS as readonly string[]).includes(r.id)) {
      push('warning', 'region_tree', 'Üst bölgesi olmayan bölge, tanımlı üst düzey bölgelerden (TOP_REGION_IDS) biri değil.', 'region', r.id)
    }
  }
  for (const id of TOP_REGION_IDS) {
    if (!regions.has(id)) issues.push(warning('region_tree', `Üst düzey bölge "${id}" için taksonomi kaydı yok.`, { file: 'content/taxonomy/regions.json' }))
  }
  const regionEdges = new Map(c.regions.filter((r) => r.parentId && r.parentId !== r.id).map((r) => [r.id, [r.parentId!]]))
  for (const cycle of findCycles(c.regions.map((r) => r.id), regionEdges)) {
    push('error', 'region_tree', `Bölge ağacında döngü: ${[...cycle, cycle[0]].join(' → ')}.`, 'region', cycle[0]!)
  }

  // Structures ----------------------------------------------------------------
  for (const s of c.structures) {
    for (const lang of LANGS) {
      const n = s.names[lang]
      if (!n) continue
      if (n.status === 'verified') {
        if (n.sources.length === 0) push('error', 'verified_without_source', `${LANG_LABEL[lang]} ad "doğrulandı" olarak işaretli ama kaynak gösterilmemiş.`, 'structure', s.id)
        else if (!hasLocator(n.sources)) push('warning', 'source_locator', `${LANG_LABEL[lang]} ad doğrulandı ama kaynakta konum (madde no, bölüm, sayfa) belirtilmemiş.`, 'structure', s.id)
      }
      checkRefs(n.sources, `${LANG_LABEL[lang]} ad`, 'structure', s.id)
    }
    s.synonyms.forEach((syn) => checkRefs(syn.sources, `Eş anlamlı "${syn.value}"`, 'structure', s.id))
    if (s.variation.isVariant && s.variation.sources.length === 0) push('warning', 'variation_source', 'Varyasyon olarak işaretli ama varyasyon için kaynak gösterilmemiş.', 'structure', s.id)
    checkRefs(s.variation.sources, 'Varyasyon', 'structure', s.id)

    for (const r of s.regions) if (!regions.has(r)) push('error', 'missing_region', `Tanımsız bölge "${r}".`, 'structure', s.id)

    for (const p of s.parentIds) {
      if (p === s.id) {
        push('error', 'self_reference', 'Yapı kendi üst yapısı (parentIds) olamaz.', 'structure', s.id)
        continue
      }
      const parent = structures.get(p)
      if (!parent) push('error', 'missing_structure', `Üst yapı "${p}" envanterde yok.`, 'structure', s.id)
      else if (opposite(s.laterality, parent.laterality))
        push('error', 'laterality', `${sideTr(s.laterality)} taraftaki yapı, ${sideTr(parent.laterality)} taraftaki "${p}" yapısının parçası olarak tanımlanmış.`, 'structure', s.id)
    }

    if (s.counterpartId !== undefined) {
      const cp = structures.get(s.counterpartId)
      if (!isSided(s.laterality)) push('error', 'counterpart', `Karşı taraf bağlantısı yalnızca sağ/sol yapılarda kullanılabilir (taraf: ${s.laterality}).`, 'structure', s.id)
      if (s.counterpartId === s.id) push('error', 'self_reference', 'Yapı kendi karşı tarafı olamaz.', 'structure', s.id)
      else if (!cp) push('error', 'missing_structure', `Karşı taraf "${s.counterpartId}" envanterde yok.`, 'structure', s.id)
      else {
        if (isSided(s.laterality) && !opposite(s.laterality, cp.laterality))
          push('error', 'counterpart', `Karşı taraf "${cp.id}" karşı tarafta değil (${sideTr(s.laterality)} ↔ ${sideTr(cp.laterality)}).`, 'structure', s.id)
        if (cp.counterpartId === undefined) push('warning', 'counterpart', `"${cp.id}" kaydında geri bağlantı (counterpartId) eksik.`, 'structure', s.id)
        else if (cp.counterpartId !== s.id) push('error', 'counterpart', `"${cp.id}" kaydının karşı tarafı "${cp.counterpartId}"; eşleşme tek yönlü.`, 'structure', s.id)
      }
    }
    if (s.genericId !== undefined) {
      const g = structures.get(s.genericId)
      if (!isSided(s.laterality)) push('error', 'generic_link', `Genel kavram bağlantısı (genericId) yalnızca sağ/sol yapılarda kullanılır (taraf: ${s.laterality}).`, 'structure', s.id)
      if (!g) push('error', 'missing_structure', `Genel kavram "${s.genericId}" envanterde yok.`, 'structure', s.id)
      else if (g.laterality !== 'paired_generic') push('error', 'generic_link', `Genel kavram "${g.id}" "paired_generic" tarafında olmalı (şu an: ${g.laterality}).`, 'structure', s.id)
    }

    for (const field of STRUCTURE_CONTENT_FIELDS) {
      const f = s.content[field]
      if (!f || f.status !== 'present') continue
      const label = `İçerik alanı "${field}"`
      checkRefs(f.sources, label, 'structure', s.id)
      if (f.verification !== 'unverified' && !hasLocator(f.sources))
        push('warning', 'source_locator', `${label} kaynakla karşılaştırıldı olarak işaretli ama kaynakta konum (bölüm, sayfa, tablo) belirtilmemiş.`, 'structure', s.id)
      if (f.verification === 'expert_approved' && !expertApproved('structure', s.id, 'text'))
        push('error', 'expert_approval_without_review', `${label} "uzman onaylı" işaretli ama anatomi uzmanının "text" onay kaydı yok.`, 'structure', s.id)
      const types = f.sources.map((r) => sources.get(r.sourceId)?.type).filter((t): t is NonNullable<typeof t> => t !== undefined)
      if (types.length > 0 && types.every((t) => WEAK_TEXT_SOURCE_TYPES.has(t)))
        push('warning', 'weak_text_source', `${label} yalnızca terminoloji/ontoloji/model kaynaklarına dayanıyor; açıklayıcı metin için ders kitabı veya makale gibi bir kaynak gerekir.`, 'structure', s.id)
    }

    for (const aspect of ['text', 'labels', 'geometry', 'relations'] as const) checkReviewState('structure', s.id, aspect, s.review[aspect], `"${aspect}" boyutu`)
    if (s.lastReviewedAt !== undefined && !reviewedTargets.has(`structure\u0000${s.id}`))
      push('warning', 'review_date', 'Son inceleme tarihi girilmiş ama bu yapı için inceleme kaydı yok.', 'structure', s.id)
  }

  // Duplicate names ------------------------------------------------------------
  for (const lang of LANGS) {
    const byName = new Map<string, string[]>()
    for (const s of c.structures) {
      const n = s.names[lang]
      if (!n) continue
      const key = normalizeName(n.value, lang)
      const list = byName.get(key)
      if (list) list.push(s.id)
      else byName.set(key, [s.id])
    }
    for (const [name, ids] of byName) {
      if (ids.length < 2) continue
      // Right/left instances and their generic concept share the side-less term (TA2 has no
      // sided terms); only other collisions are reported.
      const conceptOf = (id: string) => {
        const st = structures.get(id)
        return st && (st.laterality === 'right' || st.laterality === 'left') ? (st.genericId ?? [id, st.counterpartId ?? id].sort()[0]!) : id
      }
      if (new Set(ids.map(conceptOf)).size === 1) continue
      const shown = ids.slice(0, 10).join(', ') + (ids.length > 10 ? ` … (+${ids.length - 10})` : '')
      push('warning', 'duplicate_name', `${LANG_LABEL[lang]} "${name}" adı ${ids.length} yapıda kullanılıyor: ${shown}.`, 'structure', ids[0]!)
    }
  }

  // Part-of cycles (parentIds + part_of relations) ----------------------------
  const partOf = new Map<string, string[]>()
  for (const s of c.structures) partOf.set(s.id, s.parentIds.filter((p) => p !== s.id))
  for (const r of c.relations) {
    if (r.type !== 'part_of' || r.from === r.to) continue
    const list = partOf.get(r.from)
    if (list) list.push(r.to)
  }
  for (const cycle of findCycles(c.structures.map((s) => s.id), partOf)) {
    push('error', 'part_of_cycle', `Parça-bütün döngüsü: ${[...cycle, cycle[0]].join(' → ')}.`, 'structure', cycle[0]!)
  }

  // Relations -------------------------------------------------------------------
  const relKeys = new Map<string, string>()
  for (const r of c.relations) {
    const from = structures.get(r.from)
    const to = structures.get(r.to)
    if (!from) push('error', 'missing_structure', `İlişkinin başlangıcı "${r.from}" envanterde yok.`, 'relation', r.id)
    if (!to) push('error', 'missing_structure', `İlişkinin hedefi "${r.to}" envanterde yok.`, 'relation', r.id)
    if (r.from === r.to) push('error', 'self_reference', 'İlişki bir yapıyı kendisine bağlıyor.', 'relation', r.id)
    checkRefs(r.sources, 'İlişki', 'relation', r.id)
    if (r.verification !== 'unverified' && !hasLocator(r.sources))
      push('warning', 'source_locator', 'İlişki kaynakla karşılaştırıldı olarak işaretli ama kaynakta konum belirtilmemiş.', 'relation', r.id)
    if (r.verification === 'expert_approved' && r.review !== 'approved' && !expertApproved('relation', r.id, 'relations'))
      push('error', 'expert_approval_without_review', 'İlişki "uzman onaylı" işaretli ama anatomi uzmanının onay kaydı yok.', 'relation', r.id)
    checkReviewState('relation', r.id, 'relations', r.review, 'İlişki')
    const key = `${r.type}\u0000${r.from}\u0000${r.to}\u0000${r.qualifier ?? ''}`
    const dup = relKeys.get(key)
    if (dup) push('warning', 'duplicate_relation', `Aynı ilişki "${dup}" kimliğiyle zaten tanımlı.`, 'relation', r.id)
    else relKeys.set(key, r.id)
    if (from && to && SIDE_BOUND_RELATIONS.has(r.type) && opposite(from.laterality, to.laterality))
      push('warning', 'cross_side_relation', `"${r.type}" ilişkisi ${sideTr(from.laterality)} ve ${sideTr(to.laterality)} taraftaki yapıları bağlıyor; taraf karışıklığı olabilir.`, 'relation', r.id)
  }

  // Sources and model assets ----------------------------------------------------
  const unverifiedLicenseReported = new Set<string>()
  const ownX = new Map<string, number[]>()
  for (const a of c.assets) {
    const src = sources.get(a.sourceId)
    if (!src) push('error', 'missing_source', `Model varlığının kaynağı "${a.sourceId}" tanımlı değil.`, 'asset', a.id)
    else {
      const l = src.license
      if (!l.allowsUse || !l.allowsModification || !l.allowsRedistribution)
        push('error', 'license', `"${src.id}" lisansı model için gereken izinleri vermiyor (kullanım: ${l.allowsUse}, değiştirme: ${l.allowsModification}, dağıtım: ${l.allowsRedistribution}).`, 'asset', a.id)
      if (!l.verifiedAt && !unverifiedLicenseReported.has(src.id)) {
        unverifiedLicenseReported.add(src.id)
        push('warning', 'license_unverified', `"${src.id}" lisansı birincil kaynaktan okunup tarihlenmemiş (license.verifiedAt yok); model dağıtımından önce doğrulanmalı.`, 'source', src.id)
      }
    }
    if (a.detailFor !== undefined && !assets.has(a.detailFor)) push('error', 'missing_asset', `Ayrıntı modelinin bağlı olduğu "${a.detailFor}" varlığı yok.`, 'asset', a.id)
    for (const r of a.regions) if (!regions.has(r)) push('warning', 'missing_region', `Tanımsız bölge "${r}".`, 'asset', a.id)
    checkReviewState('asset', a.id, 'geometry', a.review.geometry, 'Geometri')

    const nodeNames = new Set<string>()
    const orphans: string[] = []
    for (const n of a.nodes) {
      if (nodeNames.has(n.node)) push('error', 'duplicate_node', `Düğüm adı "${n.node}" bu varlıkta birden fazla kez geçiyor.`, 'asset', a.id)
      nodeNames.add(n.node)
      if (!structures.has(n.structureId)) orphans.push(n.structureId)
      else if (a.representation === 'anatomical' && a.registeredToBody) {
        const list = ownX.get(n.structureId)
        if (list) list.push(n.centroid[0])
        else ownX.set(n.structureId, [n.centroid[0]])
      }
    }
    if (orphans.length > 0) {
      const uniq = [...new Set(orphans)]
      push('warning', 'orphan_asset_node', `${orphans.length} düğüm envanterde olmayan ${uniq.length} yapıya bağlı (ör. ${uniq.slice(0, 5).join(', ')}).`, 'asset', a.id)
    }
  }

  // Right/left pairs: the right instance must lie on the subject's right (+X = subject's left).
  const meanX = (id: string) => {
    const xs = ownX.get(id)
    return xs && xs.length > 0 ? xs.reduce((sum, x) => sum + x, 0) / xs.length : undefined
  }
  for (const s of c.structures) {
    if (s.laterality !== 'right' || !s.counterpartId) continue
    const cp = structures.get(s.counterpartId)
    if (!cp || cp.laterality !== 'left') continue
    const xr = meanX(s.id)
    const xl = meanX(cp.id)
    // A mismatch already recorded as a failed 'centroid-side' automated check stays visible as
    // a warning instead of blocking the build (it awaits geometry review).
    const recorded = (x: typeof s) => x.automatedChecks.some((a) => a.check === 'centroid-side' && a.result === 'fail')
    const known = recorded(s) || recorded(cp)
    if (xr !== undefined && xl !== undefined && xr >= xl)
      push(known ? 'warning' : 'error', 'centroid_side', `Sağ yapının model merkezi (x=${xr.toFixed(4)}), sol karşılığı "${cp.id}" (x=${xl.toFixed(4)}) ile aynı hizada ya da ondan daha solda. Kanonik çerçevede +X deneğin soludur; sağ yapının x değeri daha küçük olmalı.`, 'structure', s.id)
  }

  // Review records -------------------------------------------------------------
  const targetExists = (t: ReviewRecord['target']) => {
    switch (t.type) {
      case 'structure':
        return structures.has(t.id)
      case 'relation':
        return relations.has(t.id)
      case 'asset':
        return assets.has(t.id)
      case 'question':
        return questions.has(t.id)
      case 'lesson':
        return lessons.has(t.id)
    }
  }
  for (const r of c.reviews) {
    if (!targetExists(r.target)) push('error', 'missing_target', `İnceleme hedefi ${r.target.type} "${r.target.id}" bulunamadı.`, 'review', r.id)
    if (!REVIEW_ASPECTS_BY_TARGET[r.target.type].includes(r.aspect))
      push('error', 'review_aspect', `"${r.aspect}" boyutu ${r.target.type} hedefi için kullanılamaz (izinli: ${REVIEW_ASPECTS_BY_TARGET[r.target.type].join(', ')}).`, 'review', r.id)
    if (r.status !== 'draft' && r.status !== 'source_check_pending' && !r.reviewer)
      push('error', 'review_without_reviewer', `"${r.status}" durumundaki inceleme kaydında incelemeci (ad ve rol) belirtilmemiş.`, 'review', r.id)
    if (r.status === 'approved' && r.reviewer && r.reviewer.role !== 'anatomy_expert')
      push('error', 'review_role', `Yayın onayını yalnızca anatomi uzmanı verebilir (incelemeci rolü: ${r.reviewer.role}).`, 'review', r.id)
  }

  // Lessons and questions -------------------------------------------------------
  const checkStructureRef = (id: string | undefined, context: string, kind: RecordKind, owner: string) => {
    if (id !== undefined && !structures.has(id)) push('error', 'missing_structure', `${context}: "${id}" envanterde yok.`, kind, owner)
  }
  for (const l of c.lessons) {
    for (const step of l.steps) {
      step.focus.forEach((id) => checkStructureRef(id, `Adım "${step.id}" odak`, 'lesson', l.id))
      step.show.forEach((id) => checkStructureRef(id, `Adım "${step.id}" gösterilecek`, 'lesson', l.id))
      checkRefs(step.sources, `Adım "${step.id}"`, 'lesson', l.id)
    }
    for (const r of l.regions) if (!regions.has(r)) push('error', 'missing_region', `Tanımsız bölge "${r}".`, 'lesson', l.id)
    checkReviewState('lesson', l.id, 'lesson', l.review, 'Ders')
  }
  for (const q of c.questions) {
    checkStructureRef(q.target, 'Soru hedefi', 'question', q.id)
    checkStructureRef(q.answer.structureId, 'Cevap yapısı', 'question', q.id)
    q.options?.forEach((o) => checkStructureRef(o.structureId, `Seçenek "${o.id}"`, 'question', q.id))
    q.requiresVisible.forEach((id) => checkStructureRef(id, 'Görünür olması gereken yapı', 'question', q.id))
    checkRefs(q.sources, 'Soru', 'question', q.id)
    for (const r of q.regions) if (!regions.has(r)) push('error', 'missing_region', `Tanımsız bölge "${r}".`, 'question', q.id)
    if (q.type === 'mcq' && (!q.options || q.options.length < 2)) push('error', 'question', 'Çoktan seçmeli soruda en az iki seçenek olmalı.', 'question', q.id)
    if (q.answer.optionId !== undefined && !q.options?.some((o) => o.id === q.answer.optionId))
      push('error', 'question', `Cevap seçeneği "${q.answer.optionId}" seçenekler arasında yok.`, 'question', q.id)
    if (q.options && new Set(q.options.map((o) => o.id)).size !== q.options.length) push('error', 'question', 'Seçenek kimlikleri yineleniyor.', 'question', q.id)
    checkReviewState('question', q.id, 'question', q.review, 'Soru')
  }

  // Scope targets ---------------------------------------------------------------
  for (const t of c.scope) {
    checkRefs(t.basis, 'Kapsam dayanağı', 'scope', t.id)
    if (!regions.has(t.region)) push('error', 'missing_region', `Tanımsız bölge "${t.region}".`, 'scope', t.id)
    const sid = scopeStructureId(t)
    if (t.structureId !== undefined && !structures.has(t.structureId)) {
      push('warning', 'scope_target', `Bağlı yapı "${t.structureId}" henüz envanterde yok.`, 'scope', t.id)
    } else if (sid) {
      const s = structures.get(sid)
      if (s && !s.systems.includes(t.system)) push('warning', 'scope_target', `Hedef sistemi "${t.system}", yapının sistemleri (${s.systems.join(', ')}) arasında değil.`, 'scope', t.id)
      if (s && s.laterality !== t.laterality) push('warning', 'scope_target', `Hedef tarafı (${t.laterality}) yapının tarafıyla (${s.laterality}) uyuşmuyor.`, 'scope', t.id)
    }
  }

  return issues
}

/** Structure a scope target points to: explicit `structureId`, or the target id itself when it is a structure id. */
export function scopeStructureId(t: { id: string; structureId?: string | undefined }): string | undefined {
  if (t.structureId) return t.structureId
  return /^(fma|uberon|ax):[A-Za-z0-9_.-]+$/.test(t.id) ? t.id : undefined
}

/** Aggregate gaps that are too numerous to list per record (shown in the validation summary). */
export interface ContentSummary {
  counts: Record<string, number>
  structuresWithoutName: Record<'tr' | 'la' | 'en', number>
  structuresWithVerifiedName: Record<'tr' | 'la' | 'en', number>
  structuresWithoutRegion: number
  structuresBySource: Record<string, number>
  taxonomyUnverifiedNames: number
}

export function summarizeContent(c: CompiledContent): ContentSummary {
  const without = { tr: 0, la: 0, en: 0 }
  const verified = { tr: 0, la: 0, en: 0 }
  const bySource: Record<string, number> = {}
  let noRegion = 0
  for (const s of c.structures) {
    for (const lang of LANGS) {
      const n = s.names[lang]
      if (!n) without[lang]++
      else if (n.status === 'verified') verified[lang]++
    }
    if (s.regions.length === 0) noRegion++
    bySource[s.provenance.createdBy] = (bySource[s.provenance.createdBy] ?? 0) + 1
  }
  let taxUnverified = 0
  for (const t of [...c.authoredSystems, ...c.authoredRegions]) {
    for (const { entry } of taxonNameEntries(t.names)) if (entry.status !== 'verified') taxUnverified++
  }
  return {
    counts: contentCounts(c),
    structuresWithoutName: without,
    structuresWithVerifiedName: verified,
    structuresWithoutRegion: noRegion,
    structuresBySource: bySource,
    taxonomyUnverifiedNames: taxUnverified,
  }
}

export function contentCounts(c: CompiledContent): Record<string, number> {
  return {
    systems: c.systems.length,
    regions: c.regions.length,
    structures: c.structures.length,
    relations: c.relations.length,
    sources: c.sources.length,
    assets: c.assets.length,
    assetNodes: c.assets.reduce((n, a) => n + a.nodes.length, 0),
    lessons: c.lessons.length,
    questions: c.questions.length,
    reviews: c.reviews.length,
    scope: c.scope.length,
  }
}
