/**
 * Structure records for the HRA female reproductive import (content/structures/kadin/ureme.json).
 *
 * Pure function of the catalogue (./catalog.ts): the committed file is regenerated with
 * `npm run models:hra -- --write-structures` and a test keeps it identical to this output.
 * These are full records (not overlays): BodyParts3D has no female anatomy, so the ids are not in
 * the imported inventory.
 */
import type { StructureInput } from '../../../src/core/schema.ts'
import { HRA_DATASETS, HRA_SOURCE_ID } from './source.ts'
import { HRA_IMPORT_DATE, HRA_RECORDS, type CatalogRecord, type CrosswalkEvidence } from './catalog.ts'

export const HRA_STRUCTURES_FILE = 'content/structures/kadin/ureme.json'

/** "UBERON:0000995" -> "uberon:0000995", "FMA:17561" -> "fma:17561". */
export function structureIdFromOntologyId(ontologyId: string): string {
  const m = /^(UBERON|FMA):(\d+)$/.exec(ontologyId)
  if (!m) throw new Error(`Beklenmeyen ontoloji kimliği: "${ontologyId}"`)
  return `${m[1]!.toLowerCase()}:${m[2]}`
}

export function ontologyIdFromStructureId(id: string): string {
  const m = /^(uberon|fma):(\d+)$/.exec(id)
  if (!m) throw new Error(`Beklenmeyen yapı kimliği: "${id}"`)
  return `${m[1]!.toUpperCase()}:${m[2]}`
}

function versionOf(dataset: string): string {
  const d = HRA_DATASETS.find((x) => x.name === dataset)
  if (!d) throw new Error(`Katalogda tanımsız HRA veri kümesi: ${dataset}`)
  return d.version
}

export function evidenceLocator(e: CrosswalkEvidence): string {
  return `${e.dataset} ${versionOf(e.dataset)} crosswalk.csv — ${e.node} (${e.ontologyId})`
}

function externalIdsOf(r: CatalogRecord): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of r.evidence) {
    const [ns, num] = structureIdFromOntologyId(e.ontologyId).split(':') as ['uberon' | 'fma', string]
    if (out[ns] !== undefined && out[ns] !== num) throw new Error(`${r.id}: iki farklı ${ns} kimliği (${out[ns]}, ${num})`)
    out[ns] = num
  }
  return out
}

const BASE_NOTE =
  'HRA 3B Referans Nesne Kütüphanesi içe aktarımı. İngilizce ad HRA crosswalk.csv dosyasından alındı; terminoloji standardıyla karşılaştırılmadı (doğrulanmadı). ' +
  'Tür, taraf, üst yapı, karşı taraf ve ayrıntı düzeyi bu projede atandı; anatomi uzmanı incelemesi bekliyor. ' +
  '3B modeli farklı bir bağışçıya (Visible Human kadın) aittir ve BodyParts3D erkek gövdesine hizalı değildir.'

export function hraStructureRecords(): StructureInput[] {
  const ids = new Set(HRA_RECORDS.map((r) => r.id))
  const records = HRA_RECORDS.map((r): StructureInput => {
    const primary = r.evidence[0]
    if (!primary) throw new Error(`${r.id}: crosswalk kanıtı yok`)
    if (structureIdFromOntologyId(primary.ontologyId) !== r.id) throw new Error(`${r.id}: kimlik crosswalk kimliğiyle (${primary.ontologyId}) uyuşmuyor`)
    for (const ref of [r.parent, r.counterpart]) if (ref !== undefined && !ids.has(ref)) throw new Error(`${r.id}: "${ref}" katalogda yok`)
    const nodes = r.evidence.map((e) => `${e.dataset} ${versionOf(e.dataset)}: ${e.node}`).join('; ')
    return {
      id: r.id,
      schemaVersion: 1,
      kind: r.kind,
      names: {
        en: {
          value: primary.label,
          status: 'unverified',
          sources: r.evidence
            .filter((e) => e.label === primary.label)
            .map((e) => ({ sourceId: HRA_SOURCE_ID, locator: evidenceLocator(e) })),
        },
      },
      externalIds: externalIdsOf(r),
      systems: ['reproductive'],
      regions: ['pelvis_perineum'],
      regionBasis: 'authored',
      laterality: r.laterality,
      ...(r.counterpart ? { counterpartId: r.counterpart } : {}),
      parentIds: r.parent ? [r.parent] : [],
      sex: 'female',
      detailLevel: r.detailLevel,
      module: 'core',
      review: { text: 'draft', labels: 'draft', geometry: 'draft', relations: 'draft' },
      provenance: {
        createdBy: 'import:hra',
        createdAt: HRA_IMPORT_DATE,
        updatedAt: HRA_IMPORT_DATE,
        notes: `${BASE_NOTE} Kaynak düğüm(ler): ${nodes}.${r.note ? ` ${r.note}` : ''}`,
      },
    }
  })
  return records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
