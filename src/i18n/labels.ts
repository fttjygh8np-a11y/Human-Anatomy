/**
 * Turkish UI labels for domain enums. Anatomical names themselves live in content data,
 * never here.
 */
import type {
  DetailLevel,
  Laterality,
  RelationType,
  ReviewAspect,
  ReviewStatus,
  StructureKind,
  CameraPreset,
  VisibilityMode,
} from '../core/schema.ts'

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: 'Taslak',
  source_check_pending: 'Kaynak kontrolü bekliyor',
  expert_review_pending: 'Anatomi uzmanı incelemesi bekliyor',
  needs_revision: 'Düzeltme gerekli',
  approved: 'Yayına onaylı',
}

export const REVIEW_ASPECT_LABEL: Record<ReviewAspect, string> = {
  text: 'Metin',
  labels: 'Ad ve etiketler',
  geometry: '3B geometri',
  relations: 'İlişkiler',
  question: 'Soru',
  lesson: 'Ders',
}

export const FIELD_STATE_LABEL = {
  not_applicable: 'Uygulanamaz',
  missing: 'Henüz eklenmedi',
  unverified: 'Doğrulanmadı',
  source_checked: 'Kaynakla karşılaştırıldı',
  expert_approved: 'Uzman onaylı',
} as const

export const DETAIL_LEVEL_LABEL: Record<DetailLevel, string> = {
  basic: 'Temel',
  intermediate: 'Orta',
  advanced: 'İleri',
}

export const LATERALITY_LABEL: Record<Laterality, string> = {
  right: 'Sağ',
  left: 'Sol',
  midline: 'Orta hat',
  paired_generic: 'Çift (iki taraflı)',
  unpaired: 'Tek',
  not_applicable: '—',
}

export const VISIBILITY_LABEL: Record<VisibilityMode, string> = {
  visible: 'Görünür',
  hidden: 'Gizli',
  ghost: 'Saydam',
}

export const CAMERA_PRESET_LABEL: Record<CameraPreset, string> = {
  anterior: 'Önden',
  posterior: 'Arkadan',
  right: 'Sağdan',
  left: 'Soldan',
  superior: 'Üstten',
  inferior: 'Alttan',
}

/** Relation labels in both directions ("from → to" and the inverse "to → from"). */
export const RELATION_LABEL: Record<RelationType, { forward: string; inverse: string }> = {
  part_of: { forward: 'Bir parçasıdır', inverse: 'Parçaları' },
  branch_of: { forward: 'Dalıdır', inverse: 'Dalları' },
  tributary_of: { forward: 'Kolu (döküldüğü damar)', inverse: 'Kolları' },
  continuous_with: { forward: 'Devamı', inverse: 'Devamı' },
  arterial_supply: { forward: 'Arteriyel beslenme', inverse: 'Beslediği yapılar' },
  venous_drainage: { forward: 'Venöz dönüş', inverse: 'Drene ettiği yapılar' },
  lymphatic_drainage: { forward: 'Lenfatik drenaj', inverse: 'Lenfini topladığı yapılar' },
  innervated_by: { forward: 'İnnervasyon', inverse: 'İnnerve ettiği yapılar' },
  origin_on: { forward: 'Başlangıç (origo)', inverse: 'Buradan başlayan kaslar' },
  insertion_on: { forward: 'Sonlanış (insersiyo)', inverse: 'Buraya tutunan kaslar' },
  articulates_with: { forward: 'Eklem yaptığı yapılar', inverse: 'Eklem yaptığı yapılar' },
  adjacent_to: { forward: 'Komşuları', inverse: 'Komşuları' },
  passes_through: { forward: 'Geçtiği yer', inverse: 'İçinden geçen yapılar' },
  contains: { forward: 'İçerdiği yapılar', inverse: 'İçinde bulunduğu yapı' },
  bounded_by: { forward: 'Sınırları', inverse: 'Sınırladığı yapılar' },
  member_of_group: { forward: 'Ait olduğu grup', inverse: 'Grubun üyeleri' },
  located_in_compartment: { forward: 'Bulunduğu kompartıman', inverse: 'Kompartımandaki yapılar' },
  acts_on_joint: { forward: 'Etki ettiği eklem', inverse: 'Bu ekleme etki eden kaslar' },
  attaches_to: { forward: 'Tutunduğu yapılar', inverse: 'Buraya tutunan yapılar' },
}

/** Relation groups shown on the info card (each group can highlight its structures in 3D). */
export const RELATION_GROUPS: { id: string; label: string; types: RelationType[] }[] = [
  { id: 'neighbors', label: 'Komşuları', types: ['adjacent_to', 'bounded_by', 'contains', 'passes_through', 'located_in_compartment'] },
  { id: 'vessels', label: 'İlişkili damarlar', types: ['arterial_supply', 'venous_drainage', 'branch_of', 'tributary_of'] },
  { id: 'lymph', label: 'Lenfatik drenaj', types: ['lymphatic_drainage'] },
  { id: 'nerves', label: 'İlişkili sinirler', types: ['innervated_by'] },
  { id: 'attachments', label: 'Tutunma ve eklemler', types: ['origin_on', 'insertion_on', 'attaches_to', 'articulates_with', 'acts_on_joint'] },
  { id: 'hierarchy', label: 'Bağlantılı yapılar', types: ['part_of', 'member_of_group', 'continuous_with'] },
]

export const STRUCTURE_KIND_LABEL: Record<StructureKind, string> = {
  body_region: 'Vücut bölgesi',
  bone: 'Kemik',
  bone_part: 'Kemik bölümü',
  bone_landmark: 'Kemik yüzey işareti',
  foramen_or_canal: 'Delik / kanal',
  joint: 'Eklem',
  ligament: 'Bağ',
  cartilage: 'Kıkırdak',
  articular_disc_or_meniscus: 'Eklem diski / menisküs',
  bursa_or_sheath: 'Bursa / kılıf',
  muscle: 'Kas',
  muscle_group: 'Kas grubu',
  tendon: 'Tendon',
  aponeurosis: 'Aponevroz',
  fascia: 'Fasya',
  compartment: 'Kompartıman',
  heart_part: 'Kalp bölümü',
  artery: 'Arter',
  vein: 'Ven',
  vascular_group: 'Damar grubu',
  lymphatic_vessel: 'Lenf damarı',
  lymph_node_group: 'Lenf düğümü grubu',
  lymphoid_organ: 'Lenfoid organ',
  brain_part: 'Beyin bölümü',
  spinal_cord_part: 'Omurilik bölümü',
  meninges: 'Zar (meninks)',
  ventricular_system: 'Ventriküler sistem',
  nerve: 'Sinir',
  nerve_plexus: 'Sinir ağı (pleksus)',
  ganglion: 'Gangliyon',
  autonomic_structure: 'Otonom yapı',
  organ: 'Organ',
  organ_part: 'Organ bölümü',
  gland: 'Bez',
  duct: 'Kanal (duktus)',
  tooth: 'Diş',
  cavity_or_space: 'Boşluk / aralık',
  serous_membrane: 'Seröz zar',
  peritoneal_structure: 'Periton yapısı',
  sense_organ_part: 'Duyu organı bölümü',
  skin_layer: 'Deri katmanı',
  skin_appendage: 'Deri eki',
  surface_landmark: 'Yüzey işareti',
  other: 'Diğer',
}
