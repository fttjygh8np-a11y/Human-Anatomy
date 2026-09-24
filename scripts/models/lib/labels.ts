/**
 * Display labels for asset chunks (system × region). These are UI labels for the model catalogue,
 * not anatomical content records; the authoritative trilingual taxonomy lives in content/taxonomy.
 */
import type { SystemId } from '../../../src/core/schema.ts'
import type { TopRegionId } from './classify.ts'

export const SYSTEM_LABELS: Record<SystemId, { tr: string; en: string }> = {
  skeletal: { tr: 'İskelet sistemi', en: 'Skeletal system' },
  articular: { tr: 'Eklemler', en: 'Articular system' },
  muscular: { tr: 'Kas sistemi', en: 'Muscular system' },
  cardiovascular: { tr: 'Dolaşım sistemi', en: 'Cardiovascular system' },
  lymphatic: { tr: 'Lenfatik sistem', en: 'Lymphatic system' },
  nervous: { tr: 'Sinir sistemi', en: 'Nervous system' },
  respiratory: { tr: 'Solunum sistemi', en: 'Respiratory system' },
  digestive: { tr: 'Sindirim sistemi', en: 'Digestive system' },
  urinary: { tr: 'Üriner sistem', en: 'Urinary system' },
  reproductive: { tr: 'Üreme sistemi', en: 'Reproductive system' },
  endocrine: { tr: 'Endokrin sistem', en: 'Endocrine system' },
  sensory: { tr: 'Duyu organları', en: 'Sense organs' },
  integumentary: { tr: 'Deri ve deri ekleri', en: 'Integumentary system' },
}

export const REGION_LABELS: Record<TopRegionId | 'other', { tr: string; en: string }> = {
  head: { tr: 'Baş', en: 'Head' },
  neck: { tr: 'Boyun', en: 'Neck' },
  back: { tr: 'Sırt', en: 'Back' },
  thorax: { tr: 'Toraks', en: 'Thorax' },
  abdomen: { tr: 'Karın', en: 'Abdomen' },
  pelvis_perineum: { tr: 'Pelvis ve perine', en: 'Pelvis and perineum' },
  upper_limb: { tr: 'Üst ekstremite', en: 'Upper limb' },
  lower_limb: { tr: 'Alt ekstremite', en: 'Lower limb' },
  other: { tr: 'Bölgesi atanmamış', en: 'Region unassigned' },
}

/** Default display colours per system (linear RGB 0..1). Rendering defaults only; the viewer may override. */
export const SYSTEM_COLORS: Record<SystemId, [number, number, number]> = {
  skeletal: [0.9, 0.87, 0.78],
  articular: [0.72, 0.8, 0.85],
  muscular: [0.7, 0.25, 0.22],
  cardiovascular: [0.75, 0.12, 0.14],
  lymphatic: [0.55, 0.75, 0.4],
  nervous: [0.95, 0.85, 0.35],
  respiratory: [0.85, 0.6, 0.6],
  digestive: [0.8, 0.55, 0.4],
  urinary: [0.7, 0.55, 0.3],
  reproductive: [0.8, 0.5, 0.6],
  endocrine: [0.6, 0.45, 0.75],
  sensory: [0.45, 0.6, 0.8],
  integumentary: [0.93, 0.76, 0.65],
}
