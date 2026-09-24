/**
 * Element classification: body system, top-level region (-> loading chunk) and laterality checks.
 *
 * Order of evidence:
 *  1. `hierarchy` — an ancestor concept in the BodyParts3D part-of (then is-a) relation files whose
 *     name is a system-level concept (exact match against SYSTEM_ANCHORS), or, for regions, whose
 *     name ends in a region noun phrase ("skeleton of left upper limb" -> upper_limb).
 *  2. `heuristic` — keyword rules on the element's own English name. These are engineering
 *     heuristics, not anatomical assertions; every result carries the rule that matched and is
 *     flagged `classificationBasis: 'heuristic'` for expert review.
 *  3. `unclassified` / `unassigned` — nothing matched; never guessed.
 *
 * Laterality comes from the English name (lateralityFromEnglishName) and is verified against the
 * sign of the centroid X coordinate relative to a measured midline. Mismatches are reported as
 * failed automated checks and are never corrected automatically.
 */
import { expectedXSign, lateralityFromEnglishName } from '../../../src/core/frame.ts'
import { SYSTEM_IDS, TOP_REGION_IDS } from '../../../src/core/schema.ts'
import type { AutomatedCheck, SystemId } from '../../../src/core/schema.ts'
import { ancestorsOf } from './relations.ts'
import type { Ancestor, RelationData } from './relations.ts'
import { round } from './util.ts'

export type TopRegionId = (typeof TOP_REGION_IDS)[number]
export type ClassificationBasis = 'hierarchy' | 'heuristic' | 'unclassified'
export type RegionBasis = 'hierarchy' | 'heuristic' | 'unassigned'

/** Chunk suffix used when no region could be determined. */
export const UNASSIGNED_REGION_CHUNK = 'other'

export interface Classification {
  system: SystemId | null
  classificationBasis: ClassificationBasis
  systemEvidence: string | null
  region: TopRegionId | null
  regionBasis: RegionBasis
  regionEvidence: string | null
  /** `${system}/${region ?? 'other'}`, or null when the system is unknown. */
  chunk: string | null
}

// ---------------------------------------------------------------------------
// Hierarchy anchors (exact, case-insensitive concept names)
// ---------------------------------------------------------------------------

export const SYSTEM_ANCHORS: Record<SystemId, readonly string[]> = {
  skeletal: ['skeletal system', 'skeleton', 'bony skeleton', 'bone organ'],
  articular: ['articular system', 'joint', 'set of joints', 'ligament'],
  muscular: ['muscular system', 'musculature', 'muscle organ', 'skeletal muscle', 'skeletal muscle organ', 'set of muscles'],
  cardiovascular: ['cardiovascular system', 'heart', 'artery', 'vein', 'blood vessel', 'arterial tree', 'venous tree', 'systemic arterial tree', 'systemic venous tree'],
  lymphatic: ['lymphatic system', 'lymphoid system', 'lymphatic vessel', 'lymph node', 'lymphoid organ'],
  nervous: ['nervous system', 'central nervous system', 'peripheral nervous system', 'neuraxis', 'brain', 'spinal cord', 'nerve'],
  respiratory: ['respiratory system', 'respiratory tract', 'lung'],
  digestive: ['alimentary system', 'digestive system', 'alimentary canal', 'gastrointestinal tract'],
  urinary: ['urinary system', 'urinary tract'],
  reproductive: ['genital system', 'reproductive system', 'male genital system', 'female genital system', 'male reproductive system', 'female reproductive system'],
  endocrine: ['endocrine system', 'endocrine gland'],
  sensory: ['sense organ', 'sensory organ', 'visual system', 'auditory system', 'vestibulocochlear organ', 'eye', 'ear'],
  integumentary: ['integumentary system', 'integument', 'skin', 'skin of body'],
}

const ANCHOR_LOOKUP = new Map<string, SystemId>()
for (const sys of SYSTEM_IDS) for (const name of SYSTEM_ANCHORS[sys]) ANCHOR_LOOKUP.set(name, sys)

/** Region noun phrases matched against the tail of an ancestor name (after the last " of "). */
const REGION_TAILS: Record<string, TopRegionId> = {
  head: 'head',
  neck: 'neck',
  back: 'back',
  thorax: 'thorax',
  chest: 'thorax',
  abdomen: 'abdomen',
  pelvis: 'pelvis_perineum',
  perineum: 'pelvis_perineum',
  'upper limb': 'upper_limb',
  'free upper limb': 'upper_limb',
  'upper extremity': 'upper_limb',
  'lower limb': 'lower_limb',
  'free lower limb': 'lower_limb',
  'lower extremity': 'lower_limb',
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** "skeleton of left upper limb" -> "upper limb"; "renal pelvis" -> "renal pelvis". */
export function regionTail(name: string): string {
  const n = normalizeName(name)
  const idx = n.lastIndexOf(' of ')
  const tail = idx >= 0 ? n.slice(idx + 4) : n
  return tail.replace(/^(the )?(left |right )?/, '')
}

// ---------------------------------------------------------------------------
// Heuristic keyword rules (first match wins; order matters)
// ---------------------------------------------------------------------------

export interface KeywordRule<T> {
  id: string
  value: T
  re: RegExp
}

export const SYSTEM_RULES: KeywordRule<SystemId>[] = [
  { id: 'vessel', value: 'cardiovascular', re: /\b(arter(y|ies|ial|iole)|veins?|venous|venule|aorta|aortic|vena cava|sinus venosus|coronary|heart|myocardium|atri(um|al)|(left|right) ventricle|mitral|tricuspid|papillary muscle|chordae tendineae|pulmonary trunk|valve of)\b/ },
  { id: 'nerve', value: 'nervous', re: /\b(nerves?|plexus|ganglion|ganglia|cauda equina|spinal cord|chorda tympani)\b/ },
  { id: 'endocrine-gland', value: 'endocrine', re: /\b(thyroid gland|parathyroid|suprarenal gland|adrenal gland|pituitary|hypophysis|pineal)\b/ },
  { id: 'lymphoid', value: 'lymphatic', re: /\b(lymph|lymphatic|thoracic duct|spleen|thymus|tonsil)\b/ },
  { id: 'eye-muscle', value: 'sensory', re: /\b((superior|inferior|medial|lateral) rectus(?! (abdominis|femoris|capitis))|(superior|inferior) oblique(?! (muscle of head|capitis))|levator palpebrae)\b/ },
  { id: 'sense-organ', value: 'sensory', re: /\b(eyeball|eye|retina|cornea|lens|iris|sclera|choroid|ciliary body|lacrimal|auricle|external acoustic|cochlea|vestibule of|semicircular|tympanic|malleus|incus|stapes|auditory ossicle|olfactory bulb)\b/ },
  { id: 'brain', value: 'nervous', re: /\b(brain|cerebr(um|al)|cerebell(um|ar)|brainstem|brain stem|medulla oblongata|pons|midbrain|mesencephalon|diencephalon|thalamus|hypothalamus|hippocamp(us|al)|amygdala|gyrus|sulcus|corpus callosum|fornix|caudate|putamen|lentiform|globus pallidus|claustrum|substantia nigra|dura mater|arachnoid|pia mater|ventricle of brain|(lateral|third|fourth) ventricle|choroid plexus|insula)\b/ },
  { id: 'integument', value: 'integumentary', re: /\b(skin|epidermis|dermis|subcutaneous|hair|nail|mammary)\b/ },
  { id: 'reproductive-organ', value: 'reproductive', re: /\b(testis|testes|epididymis|ductus deferens|vas deferens|seminal vesicle|prostate|penis|scrotum|corpus cavernosum|corpus spongiosum|ejaculatory duct|bulbourethral|ovary|uterus|uterine|vagina|vulva|clitoris|labium (majus|minus))\b/ },
  { id: 'digestive-organ', value: 'digestive', re: /\b(stomach|o?esophag(us|eal)|duodenum|jejunum|ileum|colon|c(a)?ecum|appendix|rectum|anal canal|anus|liver|hepatic|gall ?bladder|bile duct|cystic duct|pancrea(s|tic)|tongue|tooth|teeth|incisor|canine tooth|premolar|molar|salivary|parotid|submandibular gland|sublingual gland|pharynx|pharyngeal|palate|oral cavity|intestine|peritoneum|omentum|mesentery)\b/ },
  { id: 'urinary-organ', value: 'urinary', re: /\b(kidney|renal|ureter|urinary bladder|bladder|urethra)\b/ },
  { id: 'respiratory-organ', value: 'respiratory', re: /\b(lung|bronch(us|i|ial|iole)|trachea|larynx|laryngeal|nasal cavity|nasal concha|pleura|thyroid cartilage|cricoid|arytenoid|epiglottis)\b/ },
  { id: 'costal-cartilage', value: 'skeletal', re: /\bcostal cartilage\b/ },
  { id: 'joint-structure', value: 'articular', re: /\b(ligaments?|ligamentum|menisc(us|i)|articular disc|intervertebral disc|joint capsule|articular capsule|labrum|symphysis|annulus fibrosus|nucleus pulposus|interosseous membrane|articular cartilage)\b/ },
  { id: 'muscle-word', value: 'muscular', re: /\b(muscles?|musculus|tendons?|aponeurosis|fascia|diaphragm)\b/ },
  {
    id: 'muscle-name',
    value: 'muscular',
    re: /\b(biceps|triceps|deltoid|trapezius|latissimus|pectoralis|serratus|rhomboid|levator (scapulae|ani)|gluteus|sartorius|gracilis|adductor|abductor|flexor|extensor|pronator|supinator|brachialis|brachioradialis|coracobrachialis|supraspinatus|infraspinatus|teres (major|minor)|subscapularis|rectus (abdominis|femoris|capitis)|obliquus|external oblique|internal oblique|transversus|quadratus|psoas|iliacus|iliopsoas|piriformis|gemellus|obturator (internus|externus)|tensor|vastus|semitendinosus|semimembranosus|gastrocnemius|soleus|plantaris|popliteus|tibialis|peroneus|fibularis|lumbrical|interosse(i|ous muscle)|opponens|masseter|temporalis|pterygoid|buccinator|orbicularis|zygomaticus|platysma|sternocleidomastoid|scalen(e|us)|splenius|semispinalis|multifidus|rotatores|longissimus|iliocostalis|spinalis|intercostal|subclavius|digastric|mylohyoid|geniohyoid|stylohyoid|sternohyoid|omohyoid|thyrohyoid|sternothyroid|constrictor|genioglossus|hyoglossus|styloglossus|palatoglossus|depressor|risorius|nasalis|procerus|mentalis|corrugator|occipitofrontalis|auricularis|anconeus|palmaris|pectineus|sphincter|cremaster|coccygeus|ischiocavernosus|bulbospongiosus)\b/,
  },
  {
    id: 'bone-name',
    value: 'skeletal',
    re: /\b(bones?|humerus|radius|ulna|femur|tibia|fibula|patella|clavicle|scapula|sternum|manubrium|xiphoid|ribs?|vertebra|vertebrae|atlas|axis|sacrum|coccyx|skull|cranium|mandible|maxilla|phalanx|phalanges|metacarpal|metatarsal|carpal|tarsal|scaphoid|lunate|triquetrum|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|calcaneus|talus|navicular|cuboid|cuneiform|ilium|ischium|pubis|hyoid|vomer|ethmoid|sphenoid|occipital bone|parietal bone|frontal bone|temporal bone|zygomatic bone|nasal bone|palatine bone|lacrimal bone|sesamoid)\b/,
  },
]

export const REGION_RULES: KeywordRule<TopRegionId>[] = [
  { id: 'vertebral-column', value: 'back', re: /\b(vertebra|vertebrae|atlas|axis|sacrum|coccyx|intervertebral|vertebral column|spinal cord|cauda equina|trapezius|latissimus dorsi|rhomboid|erector spinae|splenius|semispinalis|multifidus|rotatores|longissimus|iliocostalis|spinalis|levator scapulae|serratus posterior|interspinal(es|is)|intertransversari(i|us))\b/ },
  { id: 'head', value: 'head', re: /\b(head|skull|cran(ium|ial)|brain|cerebr(um|al)|cerebell(um|ar)|brainstem|pons|midbrain|medulla oblongata|thalamus|hypothalamus|mandible|maxilla|frontal|parietal (bone|lobe)|occipital|temporal|sphenoid|ethmoid|zygomatic|nasal|lacrimal|palatine|vomer|orbit(al)?|eye(ball)?|ear|auricle|cochlea|malleus|incus|stapes|tympanic|tongue|tooth|teeth|incisor|premolar|molar|mouth|oral|lip|cheek|fac(e|ial)|masseter|temporalis|pterygoid|buccinator|orbicularis|parotid|pituitary|hypophysis|pineal|olfactory|optic|oculomotor|trochlear|trigeminal|abducens|vestibulocochlear|dura mater|(superior|inferior|medial|lateral) rectus(?! (abdominis|femoris))|levator palpebrae)\b/ },
  { id: 'neck', value: 'neck', re: /\b(neck|cervical|larynx|laryngeal|pharynx|pharyngeal|thyroid|parathyroid|hyoid|sternocleidomastoid|scalen(e|us)|platysma|carotid|jugular|omohyoid|sternohyoid|thyrohyoid|sternothyroid|cricoid|arytenoid|epiglottis|digastric|mylohyoid|geniohyoid|stylohyoid)\b/ },
  { id: 'upper-limb', value: 'upper_limb', re: /\b(upper limb|arm|forearm|hand|fingers?|thumb|wrist|elbow|shoulder|axill(a|ary)|brachi(al|i|alis)|brachioradialis|humerus|radius|radial|ulna|ulnar|carpal|carpus|metacarpal|scaphoid|lunate|triquetr(um|al)|pisiform|trapezium|trapezoid|capitate|hamate|palmar|palmaris|pollicis|indicis|clavicle|scapula|deltoid|supinator|pronator|anconeus|coracobrachialis|supraspinatus|infraspinatus|subscapularis|teres (major|minor)|median nerve)\b/ },
  { id: 'lower-limb', value: 'lower_limb', re: /\b(lower limb|thigh|leg|knee|ankle|foot|feet|toes?|hallu(x|cis)|pedis|femur|femoral|patella|tibia|tibial|fibula|fibular|peroneal|peroneus|tarsal|tarsus|metatarsal|calcaneus|talus|navicular|cuboid|cuneiform|gluteal|gluteus|popliteal|popliteus|sartorius|gracilis|adductor (longus|brevis|magnus)|vastus|rectus femoris|quadriceps|semitendinosus|semimembranosus|biceps femoris|gastrocnemius|soleus|plantar|plantaris|sciatic|saphenous|piriformis|gemellus|obturator externus|tensor fasciae latae)\b/ },
  { id: 'pelvis-perineum', value: 'pelvis_perineum', re: /\b(pelvis|pelvic|perine(um|al)|hip bone|ilium|ischium|pubis|pubic|sacroiliac|rectum|anal|anus|urinary bladder|bladder|urethra|prostate|seminal vesicle|ductus deferens|testis|testes|epididymis|scrotum|penis|uterus|uterine|ovary|vagina|levator ani|coccygeus|obturator internus|iliac|iliacus|ischiocavernosus|bulbospongiosus)\b/ },
  { id: 'abdomen', value: 'abdomen', re: /\b(abdomen|abdominal|abdominis|stomach|duodenum|jejunum|ileum|colon|c(a)?ecum|appendix|liver|hepatic|gall ?bladder|bile duct|cystic duct|pancrea(s|tic)|spleen|splenic|kidney|renal|suprarenal|adrenal|ureter|inferior vena cava|mesenter(y|ic)|omentum|peritoneum|c(o)?eliac|psoas|quadratus lumborum|lumbar|portal vein|intestine|external oblique|internal oblique|transversus abdominis)\b/ },
  { id: 'thorax', value: 'thorax', re: /\b(thorax|thoracic|chest|heart|atri(um|al)|(left|right) ventricle|aorta|aortic|pulmonary|lung|bronch(us|i|ial|iole)|trachea|pleura|mediastin(um|al)|pericardi(um|al)|sternum|manubrium|xiphoid|ribs?|costal|intercostal|o?esophag(us|eal)|thymus|azygos|superior vena cava|diaphragm|pectoralis|serratus anterior|breast|mammary|coronary|mitral|tricuspid|papillary muscle|subclavius)\b/ },
]

export function matchRule<T>(rules: readonly KeywordRule<T>[], name: string): KeywordRule<T> | null {
  const n = normalizeName(name)
  for (const rule of rules) if (rule.re.test(n)) return rule
  return null
}

function describeAncestor(a: Ancestor): string {
  const dist = Number.isFinite(a.distance) ? `mesafe ${a.distance}` : 'element_parts listesinden'
  return `${a.hierarchy} üst kavramı FMA${a.fmaId} "${a.name ?? '?'}" (${dist})`
}

export function classifyElement(
  input: { name: string | null; fmaId: string | null; elementId: string | null },
  relations: RelationData | null,
): Classification {
  let system: SystemId | null = null
  let classificationBasis: ClassificationBasis = 'unclassified'
  let systemEvidence: string | null = null
  let region: TopRegionId | null = null
  let regionBasis: RegionBasis = 'unassigned'
  let regionEvidence: string | null = null

  if (relations) {
    const partof = ancestorsOf(relations, 'partof', input.fmaId, input.elementId)
    const isa = ancestorsOf(relations, 'isa', input.fmaId, input.elementId)
    for (const a of [...partof, ...isa]) {
      if (!a.name) continue
      const sys = ANCHOR_LOOKUP.get(normalizeName(a.name))
      if (sys) {
        system = sys
        classificationBasis = 'hierarchy'
        systemEvidence = describeAncestor(a)
        break
      }
    }
    for (const a of partof) {
      if (!a.name) continue
      const reg = REGION_TAILS[regionTail(a.name)]
      if (reg) {
        region = reg
        regionBasis = 'hierarchy'
        regionEvidence = describeAncestor(a)
        break
      }
    }
  }

  if (system === null && input.name) {
    const rule = matchRule(SYSTEM_RULES, input.name)
    if (rule) {
      system = rule.value
      classificationBasis = 'heuristic'
      systemEvidence = `ad anahtar sözcük kuralı "${rule.id}"`
    }
  }
  if (region === null && input.name) {
    const rule = matchRule(REGION_RULES, input.name)
    if (rule) {
      region = rule.value
      regionBasis = 'heuristic'
      regionEvidence = `ad anahtar sözcük kuralı "${rule.id}"`
    }
  }

  return {
    system,
    classificationBasis,
    systemEvidence,
    region,
    regionBasis,
    regionEvidence,
    chunk: system ? `${system}/${region ?? UNASSIGNED_REGION_CHUNK}` : null,
  }
}

// ---------------------------------------------------------------------------
// Laterality
// ---------------------------------------------------------------------------

export interface MidlineEstimate {
  /** Midline X in app-frame metres. */
  x: number
  method: 'override' | 'left-right-pairs' | 'overall-bbox-center' | 'default-zero'
  pairs: number
}

/** Name with the side word removed, used to pair left/right instances. */
export function sideNeutralName(name: string): string {
  return normalizeName(name)
    .replace(/\b(left|right)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Midline estimate: median of (x_left + x_right) / 2 over left/right name pairs; falls back to the
 * centre of the overall bounding box. The source data is not assumed to be centred on x = 0.
 */
export function measureMidline(
  elements: readonly { name: string | null; centroidX: number; bboxMinX: number; bboxMaxX: number }[],
  overrideX: number | null,
): MidlineEstimate {
  if (overrideX !== null) return { x: overrideX, method: 'override', pairs: 0 }
  const lefts = new Map<string, number[]>()
  const rights = new Map<string, number[]>()
  for (const e of elements) {
    if (!e.name) continue
    const side = lateralityFromEnglishName(e.name)
    if (!side) continue
    const key = sideNeutralName(e.name)
    const map = side === 'left' ? lefts : rights
    const list = map.get(key)
    if (list) list.push(e.centroidX)
    else map.set(key, [e.centroidX])
  }
  const mids: number[] = []
  for (const [key, ls] of lefts) {
    const rs = rights.get(key)
    if (!rs || ls.length !== 1 || rs.length !== 1) continue
    mids.push((ls[0]! + rs[0]!) / 2)
  }
  if (mids.length > 0) {
    mids.sort((a, b) => a - b)
    const m = mids.length >> 1
    const x = mids.length % 2 ? mids[m]! : (mids[m - 1]! + mids[m]!) / 2
    return { x, method: 'left-right-pairs', pairs: mids.length }
  }
  if (elements.length > 0) {
    const min = Math.min(...elements.map((e) => e.bboxMinX))
    const max = Math.max(...elements.map((e) => e.bboxMaxX))
    return { x: (min + max) / 2, method: 'overall-bbox-center', pairs: 0 }
  }
  return { x: 0, method: 'default-zero', pairs: 0 }
}

export interface LateralityResult {
  fromName: 'left' | 'right' | null
  /** Observed side of the centroid relative to the midline (app frame, +X = subject's left). */
  observed: 'left' | 'right' | 'midline'
  offsetX: number
  check: AutomatedCheck | null
}

export const LATERALITY_CHECK_ID = 'laterality-centroid-sign'

// ---------------------------------------------------------------------------
// Frame axis sanity checks (run on every build, recorded in build-report.json)
// ---------------------------------------------------------------------------

const AXIS_GROUPS = {
  superior: /\b(skull|cranium|brain|cerebrum|cerebellum|mandible|maxilla|malleus|incus|stapes|eyeball)\b/,
  inferior: /\b(femur|tibia|fibula|patella|calcaneus|talus|metatarsal|foot|toe)\b/,
  anterior: /\b(sternum|manubrium|xiphoid process)\b/,
  posterior: /\bthoracic vertebra\b/,
} as const

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/**
 * After conversion, +Y must be superior and +Z anterior. Compares median centroids of name groups
 * (head vs. lower-limb structures; sternum vs. thoracic vertebrae). Groups missing from the input
 * give a `partial` result instead of a guess.
 */
export function checkFrameAxes(
  elements: readonly { name: string | null; centroid: readonly [number, number, number] }[],
  meta: { tool: string; date: string },
): AutomatedCheck[] {
  const pick = (re: RegExp, axis: 1 | 2) =>
    elements.filter((e) => e.name && re.test(normalizeName(e.name))).map((e) => e.centroid[axis])
  const compare = (check: string, hi: number[], lo: number[], hiLabel: string, loLabel: string, axisLabel: string): AutomatedCheck => {
    if (hi.length === 0 || lo.length === 0) {
      return { check, tool: meta.tool, date: meta.date, result: 'partial', details: `Karşılaştırma için yeterli öğe yok (${hiLabel}: ${hi.length}, ${loLabel}: ${lo.length}).` }
    }
    const a = median(hi)
    const b = median(lo)
    return {
      check,
      tool: meta.tool,
      date: meta.date,
      result: a > b ? 'pass' : 'fail',
      details: `${axisLabel}: ${hiLabel} medyanı ${round(a, 4)} m (${hi.length} öğe), ${loLabel} medyanı ${round(b, 4)} m (${lo.length} öğe).`,
    }
  }
  return [
    compare('frame-axis-superior', pick(AXIS_GROUPS.superior, 1), pick(AXIS_GROUPS.inferior, 1), 'baş yapıları', 'alt ekstremite yapıları', '+Y süperior olmalı'),
    compare('frame-axis-anterior', pick(AXIS_GROUPS.anterior, 2), pick(AXIS_GROUPS.posterior, 2), 'sternum', 'torakal vertebralar', '+Z anterior olmalı'),
  ]
}

export function checkLaterality(
  name: string | null,
  centroidX: number,
  midline: MidlineEstimate,
  toleranceM: number,
  meta: { tool: string; date: string },
): LateralityResult {
  const fromName = name ? lateralityFromEnglishName(name) : null
  const offsetX = centroidX - midline.x
  const observed = Math.abs(offsetX) <= toleranceM ? 'midline' : offsetX > 0 ? 'left' : 'right'
  if (!fromName) return { fromName, observed, offsetX, check: null }
  const expected = expectedXSign(fromName)
  const observedSign = observed === 'midline' ? 0 : observed === 'left' ? 1 : -1
  const where = `ağırlık merkezi X = ${round(centroidX, 4)} m, orta hat X = ${round(midline.x, 4)} m (${midline.method}), fark = ${round(offsetX * 1000, 1)} mm`
  let result: AutomatedCheck['result']
  let details: string
  if (observedSign === expected) {
    result = 'pass'
    details = `Ad "${fromName}" diyor; ${where}.`
  } else if (observedSign === 0) {
    result = 'partial'
    details = `Ad "${fromName}" diyor ancak ağırlık merkezi orta hat toleransı (±${toleranceM * 1000} mm) içinde; taraf geometriden doğrulanamadı. ${where}.`
  } else {
    result = 'fail'
    details = `UYUMSUZLUK: ad "${fromName}" diyor, geometri ${observed === 'left' ? 'sol (+X)' : 'sağ (−X)'} tarafta. Otomatik düzeltme yapılmadı; uzman incelemesi gerekli. ${where}.`
  }
  return { fromName, observed, offsetX, check: { check: LATERALITY_CHECK_ID, tool: meta.tool, date: meta.date, result, details } }
}
