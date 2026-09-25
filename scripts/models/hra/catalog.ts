/**
 * Curated selection of HRA female reproductive nodes and the structure records made from them.
 *
 * Facts copied from the HRA crosswalk.csv files (ontology id + label per node) are re-checked on
 * every build against the downloaded crosswalks (./build.ts `verifyCatalog`); a mismatch stops the
 * build. Everything else here — record kind, laterality, part-of parent, counterpart, detail level,
 * which asset a node goes into — is this project's editorial assignment, marked as such in
 * provenance.notes and pending anatomy-expert review.
 */
import type { DetailLevel, Laterality, StructureKind } from '../../../src/core/schema.ts'

/** Asset groups: organs are shown by default; ligaments/peritoneal folds are an optional layer. */
export type HraAssetKey = 'organs' | 'ligaments'

export interface CrosswalkEvidence {
  dataset: string
  node: string
  /** OntologyID column exactly as printed in the crosswalk ("UBERON:0000995", "FMA:17561"). */
  ontologyId: string
  /** label column exactly as printed. */
  label: string
}

export interface CatalogRecord {
  /** Structure id derived from the crosswalk ontology id (uberon:0000995, fma:17561). */
  id: string
  /** First entry names the record (names.en); further entries add cross-ids (externalIds). */
  evidence: CrosswalkEvidence[]
  kind: StructureKind
  laterality: Laterality
  parent?: string
  counterpart?: string
  detailLevel: DetailLevel
  /** Extra note (Turkish) appended to provenance.notes. */
  note?: string
}

export interface CatalogNode {
  dataset: string
  /** Node name in the GLB and in the crosswalk. */
  node: string
  structureId: string
  asset: HraAssetKey
}

const U = 'uterus-female'
const OL = 'ovary-female-left'
const OR = 'ovary-female-right'
const TL = 'fallopian-tube-female-left'
const TR = 'fallopian-tube-female-right'
const UN = 'united-female'

const ev = (dataset: string, node: string, ontologyId: string, label: string): CrosswalkEvidence => ({ dataset, node, ontologyId, label })

const ROUND_LIGAMENT_NOTE =
  "HRA united-female v1.10'da bu adı taşıyan düğümün geometrisi karşı tarafta (sağ ↔ sol) bulunuyor; " +
  'taraf denetimi başarısız olduğu için model düğümü derlemeye alınmadı. Otomatik düzeltme yapılmadı; kaynağa bildirilmeli ve uzman incelemesi gerekli.'

export const HRA_RECORDS: readonly CatalogRecord[] = [
  // Uterus (uterus-female v1.2)
  { id: 'uberon:0000995', evidence: [ev(U, 'VH_F_uterus', 'UBERON:0000995', 'uterus')], kind: 'organ', laterality: 'midline', detailLevel: 'basic' },
  { id: 'uberon:0009853', evidence: [ev(U, 'VH_F_body_of_uterus', 'UBERON:0009853', 'body of uterus')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'intermediate' },
  { id: 'fma:17561', evidence: [ev(U, 'VH_F_fundus_of_uterus', 'FMA:17561', 'Fundus of uterus')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'intermediate' },
  { id: 'fma:17752', evidence: [ev(U, 'VH_F_lower_uterine_segment', 'FMA:17752', 'Lower uterine segment')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'advanced' },
  { id: 'fma:224878', evidence: [ev(U, 'VH_F_posterior_wall_of_uterus', 'FMA:224878', 'Posterior wall of uterus')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'advanced' },
  { id: 'fma:224876', evidence: [ev(U, 'VH_F_anterior_wall_of_uterus', 'FMA:224876', 'Anterior wall of uterus')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'advanced' },
  { id: 'uberon:0000002', evidence: [ev(U, 'VH_F_cervix', 'UBERON:0000002', 'uterine cervix')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000995', detailLevel: 'intermediate' },
  { id: 'uberon:0013759', evidence: [ev(U, 'VH_F_internal_cervical_os', 'UBERON:0013759', 'internal cervical os')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000002', detailLevel: 'intermediate' },
  { id: 'uberon:0013760', evidence: [ev(U, 'VH_F_external_cervical_os', 'UBERON:0013760', 'external cervical os')], kind: 'organ_part', laterality: 'midline', parent: 'uberon:0000002', detailLevel: 'intermediate' },

  // Ovaries (ovary-female-left/right v1.3; FMA ids from the united crosswalk)
  {
    id: 'uberon:0002119',
    evidence: [ev(OL, 'VH_F_left_ovary', 'UBERON:0002119', 'Left ovary'), ev(UN, 'VH_F_left_ovary', 'FMA:7214', 'Left ovary')],
    kind: 'organ', laterality: 'left', counterpart: 'uberon:0002118', detailLevel: 'basic',
  },
  {
    id: 'uberon:0002118',
    evidence: [ev(OR, 'VH_F_right_ovary', 'UBERON:0002118', 'Right ovary'), ev(UN, 'VH_F_right_ovary', 'FMA:7213', 'Right ovary')],
    kind: 'organ', laterality: 'right', counterpart: 'uberon:0002119', detailLevel: 'basic',
  },

  // Uterine tubes (fallopian-tube-female-left/right v1.2)
  { id: 'uberon:0001303', evidence: [ev(TL, 'VH_F_fallopian_tube_L', 'UBERON:0001303', 'left uterine tube')], kind: 'organ', laterality: 'left', counterpart: 'uberon:0001302', detailLevel: 'basic' },
  { id: 'uberon:0001302', evidence: [ev(TR, 'VH_F_fallopian_tube_R', 'UBERON:0001302', 'right uterine tube')], kind: 'organ', laterality: 'right', counterpart: 'uberon:0001303', detailLevel: 'basic' },
  { id: 'fma:18490', evidence: [ev(TL, 'VH_F_uterine_tube_infundibulum_L', 'FMA:18490', 'Infundibulum of left uterine tube')], kind: 'organ_part', laterality: 'left', parent: 'uberon:0001303', counterpart: 'fma:18489', detailLevel: 'intermediate' },
  { id: 'fma:18489', evidence: [ev(TR, 'VH_F_uterine_tube_infundibulum_R', 'FMA:18489', 'Infundibulum of right uterine tube')], kind: 'organ_part', laterality: 'right', parent: 'uberon:0001302', counterpart: 'fma:18490', detailLevel: 'intermediate' },
  { id: 'fma:18498', evidence: [ev(TL, 'VH_F_fibria_of_uterine_tube_L', 'FMA:18498', 'Fimbria of left uterine tube')], kind: 'organ_part', laterality: 'left', parent: 'uberon:0001303', counterpart: 'fma:18497', detailLevel: 'intermediate' },
  { id: 'fma:18497', evidence: [ev(TR, 'VH_F_fibria_of_uterine_tube_R', 'FMA:18497', 'Fimbria of right uterine tube')], kind: 'organ_part', laterality: 'right', parent: 'uberon:0001302', counterpart: 'fma:18498', detailLevel: 'intermediate' },
  { id: 'fma:18494', evidence: [ev(TL, 'VH_F_isthmus_of_fallopian_tube_L', 'FMA:18494', 'Isthmus of left uterine tube')], kind: 'organ_part', laterality: 'left', parent: 'uberon:0001303', counterpart: 'fma:18493', detailLevel: 'intermediate' },
  { id: 'fma:18493', evidence: [ev(TR, 'VH_F_isthmus_of_fallopian_tube_R', 'FMA:18493', 'Isthmus of right uterine tube')], kind: 'organ_part', laterality: 'right', parent: 'uberon:0001302', counterpart: 'fma:18494', detailLevel: 'intermediate' },
  { id: 'fma:18492', evidence: [ev(TL, 'VH_F_ampulla_of_uterine_tube_L', 'FMA:18492', 'Ampulla of left uterine tube')], kind: 'organ_part', laterality: 'left', parent: 'uberon:0001303', counterpart: 'fma:18491', detailLevel: 'intermediate' },
  { id: 'fma:18491', evidence: [ev(TR, 'VH_F_ampulla_of_uterine_tube_R', 'FMA:18491', 'Ampulla of right uterine tube')], kind: 'organ_part', laterality: 'right', parent: 'uberon:0001302', counterpart: 'fma:18492', detailLevel: 'intermediate' },

  // Vagina, ligaments and peritoneal folds (united-female v1.10 only)
  { id: 'uberon:0000996', evidence: [ev(UN, 'VH_F_vagina', 'UBERON:0000996', 'vagina')], kind: 'organ', laterality: 'midline', detailLevel: 'basic' },
  { id: 'fma:14729', evidence: [ev(UN, 'VH_F_uterovesical_pouch', 'FMA:14729', 'Uterovesical pouch')], kind: 'peritoneal_structure', laterality: 'midline', detailLevel: 'intermediate' },
  { id: 'uberon:0012332', evidence: [ev(UN, 'VH_F_broad_ligament', 'UBERON:0012332', 'broad ligament of uterus')], kind: 'peritoneal_structure', laterality: 'paired_generic', detailLevel: 'intermediate' },
  { id: 'fma:19810', evidence: [ev(UN, 'VH_F_mesosalpinx_L', 'FMA:19810', 'Left mesosalpinx')], kind: 'peritoneal_structure', laterality: 'left', parent: 'uberon:0012332', counterpart: 'fma:19809', detailLevel: 'intermediate' },
  { id: 'fma:19809', evidence: [ev(UN, 'VH_F_mesosalpinx_R', 'FMA:19809', 'Right mesosalpinx')], kind: 'peritoneal_structure', laterality: 'right', parent: 'uberon:0012332', counterpart: 'fma:19810', detailLevel: 'intermediate' },
  { id: 'fma:19818', evidence: [ev(UN, 'VH_F_mesovarium_L', 'FMA:19818', 'Left mesovarium')], kind: 'peritoneal_structure', laterality: 'left', parent: 'uberon:0012332', counterpart: 'fma:19817', detailLevel: 'intermediate' },
  { id: 'fma:19817', evidence: [ev(UN, 'VH_F_mesovarium_R', 'FMA:19817', 'Right mesovarium')], kind: 'peritoneal_structure', laterality: 'right', parent: 'uberon:0012332', counterpart: 'fma:19818', detailLevel: 'intermediate' },
  {
    id: 'fma:77064',
    evidence: [ev(UN, 'VH_F_cardinal_ligament_of_uterus', 'FMA:77064', 'Cardinal ligament')],
    kind: 'ligament', laterality: 'paired_generic', detailLevel: 'intermediate',
    note: 'HRA sağ ve sol kardinal bağ düğümlerini aynı taraf belirtmeyen FMA kimliğine (FMA:77064) eşliyor; bu kayıt iki düğümle temsil edilir.',
  },
  { id: 'fma:57789', evidence: [ev(UN, 'VH_F_right_round_ligament_of_uterus', 'FMA:57789', 'Right round ligament of uterus')], kind: 'ligament', laterality: 'right', counterpart: 'fma:57790', detailLevel: 'intermediate', note: ROUND_LIGAMENT_NOTE },
  { id: 'fma:57790', evidence: [ev(UN, 'VH_F_left_round_ligament_of_uterus', 'FMA:57790', 'Left round ligament of uterus')], kind: 'ligament', laterality: 'left', counterpart: 'fma:57789', detailLevel: 'intermediate', note: ROUND_LIGAMENT_NOTE },
  { id: 'fma:19119', evidence: [ev(UN, 'VH_F_right_uterosacral_ligament', 'FMA:19119', 'Right uterosacral ligament')], kind: 'ligament', laterality: 'right', counterpart: 'fma:19120', detailLevel: 'intermediate' },
  { id: 'fma:19120', evidence: [ev(UN, 'VH_F_left_uterosacral_ligament', 'FMA:19120', 'Left uterosacral ligament')], kind: 'ligament', laterality: 'left', counterpart: 'fma:19119', detailLevel: 'intermediate' },
  { id: 'fma:19823', evidence: [ev(UN, 'VH_F_suspensory_ligament_of_ovary_R', 'FMA:19823', 'Suspensory ligament of right ovary')], kind: 'ligament', laterality: 'right', counterpart: 'fma:19824', detailLevel: 'intermediate' },
  { id: 'fma:19824', evidence: [ev(UN, 'VH_F_suspensory_ligament_of_ovary_L', 'FMA:19824', 'Suspensory ligament of left ovary')], kind: 'ligament', laterality: 'left', counterpart: 'fma:19823', detailLevel: 'intermediate' },
  { id: 'fma:55423', evidence: [ev(UN, 'VH_F_ovarian_ligament_R', 'FMA:55423', 'Right ovarian ligament')], kind: 'ligament', laterality: 'right', counterpart: 'fma:55424', detailLevel: 'intermediate' },
  { id: 'fma:55424', evidence: [ev(UN, 'VH_F_ovarian_ligament_L', 'FMA:55424', 'Left ovarian ligament')], kind: 'ligament', laterality: 'left', counterpart: 'fma:55423', detailLevel: 'intermediate' },
]

const n = (dataset: string, node: string, structureId: string, asset: HraAssetKey): CatalogNode => ({ dataset, node, structureId, asset })

/** Mesh nodes to build. Each must carry the record's ontology id in its dataset's crosswalk. */
export const HRA_NODES: readonly CatalogNode[] = [
  n(U, 'VH_F_body_of_uterus', 'uberon:0009853', 'organs'),
  n(U, 'VH_F_fundus_of_uterus', 'fma:17561', 'organs'),
  n(U, 'VH_F_lower_uterine_segment', 'fma:17752', 'organs'),
  n(U, 'VH_F_posterior_wall_of_uterus', 'fma:224878', 'organs'),
  n(U, 'VH_F_anterior_wall_of_uterus', 'fma:224876', 'organs'),
  n(U, 'VH_F_cervix', 'uberon:0000002', 'organs'),
  n(U, 'VH_F_internal_cervical_os', 'uberon:0013759', 'organs'),
  n(U, 'VH_F_external_cervical_os', 'uberon:0013760', 'organs'),
  n(OL, 'VH_F_left_ovary', 'uberon:0002119', 'organs'),
  n(OR, 'VH_F_right_ovary', 'uberon:0002118', 'organs'),
  n(TL, 'VH_F_uterine_tube_infundibulum_L', 'fma:18490', 'organs'),
  n(TL, 'VH_F_fibria_of_uterine_tube_L', 'fma:18498', 'organs'),
  n(TL, 'VH_F_isthmus_of_fallopian_tube_L', 'fma:18494', 'organs'),
  n(TL, 'VH_F_ampulla_of_uterine_tube_L', 'fma:18492', 'organs'),
  n(TR, 'VH_F_uterine_tube_infundibulum_R', 'fma:18489', 'organs'),
  n(TR, 'VH_F_fibria_of_uterine_tube_R', 'fma:18497', 'organs'),
  n(TR, 'VH_F_isthmus_of_fallopian_tube_R', 'fma:18493', 'organs'),
  n(TR, 'VH_F_ampulla_of_uterine_tube_R', 'fma:18491', 'organs'),
  n(UN, 'VH_F_vagina', 'uberon:0000996', 'organs'),
  n(UN, 'VH_F_uterovesical_pouch', 'fma:14729', 'ligaments'),
  n(UN, 'VH_F_broad_ligament', 'uberon:0012332', 'ligaments'),
  n(UN, 'VH_F_mesosalpinx_L', 'fma:19810', 'ligaments'),
  n(UN, 'VH_F_mesosalpinx_R', 'fma:19809', 'ligaments'),
  n(UN, 'VH_F_mesovarium_L', 'fma:19818', 'ligaments'),
  n(UN, 'VH_F_mesovarium_R', 'fma:19817', 'ligaments'),
  n(UN, 'VH_F_right_cardinal_ligament_of_uterus', 'fma:77064', 'ligaments'),
  n(UN, 'VH_F_left_cardinal_ligament_of_uterus', 'fma:77064', 'ligaments'),
  n(UN, 'VH_F_right_round_ligament_of_uterus', 'fma:57789', 'ligaments'),
  n(UN, 'VH_F_left_round_ligament_of_uterus', 'fma:57790', 'ligaments'),
  n(UN, 'VH_F_right_uterosacral_ligament', 'fma:19119', 'ligaments'),
  n(UN, 'VH_F_left_uterosacral_ligament', 'fma:19120', 'ligaments'),
  n(UN, 'VH_F_suspensory_ligament_of_ovary_R', 'fma:19823', 'ligaments'),
  n(UN, 'VH_F_suspensory_ligament_of_ovary_L', 'fma:19824', 'ligaments'),
  n(UN, 'VH_F_ovarian_ligament_R', 'fma:55423', 'ligaments'),
  n(UN, 'VH_F_ovarian_ligament_L', 'fma:55424', 'ligaments'),
]

/**
 * Source nodes deliberately left out (reported in build-report.json and docs/model-katalogu.md).
 * Nodes failing the laterality check are excluded automatically in addition to these.
 */
export const HRA_EXCLUDED_NODES: readonly { dataset: string; node: string; reason: string }[] = [
  { dataset: U, node: 'VH_F_cervicovaginal_junction', reason: 'crosswalk.csv bu düğüm için ontoloji kimliği vermiyor; kimlik uydurulmadı.' },
  { dataset: U, node: 'VH_F_cornua', reason: 'crosswalk.csv bu düğüm için ontoloji kimliği vermiyor; kimlik uydurulmadı.' },
  {
    dataset: U,
    node: 'VH_F_abdominal_ostium_of_uterine_tube',
    reason:
      'Crosswalk "Abdominal ostium of uterine tube" (FMA:77049) diyor, ancak ağ uterus köşelerinde (VH_F_cornua ile aynı x aralığında) ve iki tarafı birden kapsıyor; ' +
      'ostium abdominale tubanın serbest (fimbriyalı) ucundadır. Etiket–konum uyuşmazlığı uzman incelemesine bırakıldı.',
  },
]

/** Sets of mesh nodes used by the frame-axis checks (all must be built). */
export const FRAME_CHECK_NODES = {
  leftOvary: 'VH_F_left_ovary',
  rightOvary: 'VH_F_right_ovary',
  /** Superior check: ovaries and uterine tubes lie above the cervix. */
  superior: ['VH_F_left_ovary', 'VH_F_right_ovary', 'VH_F_ampulla_of_uterine_tube_L', 'VH_F_ampulla_of_uterine_tube_R'],
  inferior: ['VH_F_cervix', 'VH_F_external_cervical_os'],
  /** Anterior check: the uterovesical pouch lies in front of the uterosacral ligaments. */
  anterior: ['VH_F_uterovesical_pouch'],
  posterior: ['VH_F_right_uterosacral_ligament', 'VH_F_left_uterosacral_ligament'],
} as const

/** Import date of the records (provenance.createdAt/updatedAt). */
export const HRA_IMPORT_DATE = '2026-09-25'
