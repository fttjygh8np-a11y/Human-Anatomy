/**
 * Pure label selection and screen layout (no DOM, no Three.js).
 *
 * Labels are leader-free: each label is centred on its structure's projected anchor.
 * Selected / emphasised structures are mandatory; the rest are the largest visible
 * structures, limited by the density setting and dropped when they would overlap.
 */
import type { StructureId } from '../core/schema.ts'
import type { LabelOptions } from './types.ts'

/** Maximum number of non-mandatory ("largest visible") labels per density. */
export const LABEL_DENSITY_COUNT: Record<LabelOptions['density'], number> = {
  low: 3,
  medium: 8,
  high: 18,
}

export type LabelKind = 'selected' | 'emphasis' | 'context'

export interface LabelCandidate {
  id: StructureId
  kind: LabelKind
}

export interface LabelSelectionInput {
  options: LabelOptions
  selected: readonly StructureId[]
  /** Structures emphasised by a non-quiz highlight (relation / lesson). */
  emphasized: readonly StructureId[]
  /** Visible (non-ghost) structures with a size measure (e.g. bbox diagonal). */
  visible: ReadonlyArray<{ id: StructureId; size: number }>
  /** Never auto-labelled (e.g. quiz targets, whose name is the answer). Selected ones still are. */
  exclude?: ReadonlySet<StructureId>
}

export function chooseLabelCandidates(input: LabelSelectionInput): LabelCandidate[] {
  const { options } = input
  if (!options.enabled || options.suppressNames) return []
  const out: LabelCandidate[] = []
  const seen = new Set<StructureId>()
  for (const id of input.selected) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, kind: 'selected' })
  }
  for (const id of input.emphasized) {
    if (seen.has(id) || input.exclude?.has(id)) continue
    seen.add(id)
    out.push({ id, kind: 'emphasis' })
  }
  // Over-provision context candidates: some are dropped later (off-screen / occluded / overlap).
  const budget = LABEL_DENSITY_COUNT[options.density]
  const sorted = [...input.visible].sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
  let added = 0
  for (const v of sorted) {
    if (added >= budget * 2) break
    if (seen.has(v.id) || input.exclude?.has(v.id)) continue
    seen.add(v.id)
    out.push({ id: v.id, kind: 'context' })
    added++
  }
  return out
}

export interface LabelBox {
  id: StructureId
  kind: LabelKind
  /** Anchor in CSS pixels (label centre). */
  x: number
  y: number
  w: number
  h: number
}

export interface PlacedLabel extends LabelBox {
  /** Final centre after collision nudging. */
  px: number
  py: number
}

const overlaps = (a: { px: number; py: number; w: number; h: number }, b: { px: number; py: number; w: number; h: number }, gap: number) =>
  Math.abs(a.px - b.px) * 2 < a.w + b.w + gap * 2 && Math.abs(a.py - b.py) * 2 < a.h + b.h + gap * 2

/**
 * Greedy placement: mandatory labels first (never dropped, nudged vertically if possible),
 * then context labels up to `contextLimit`, skipping any that would overlap or leave the viewport.
 */
export function layoutLabels(
  boxes: readonly LabelBox[],
  viewport: { width: number; height: number },
  contextLimit: number,
  gap = 3,
): PlacedLabel[] {
  const placed: PlacedLabel[] = []
  const inside = (p: { px: number; py: number; w: number; h: number }) =>
    p.px - p.w / 2 >= 0 && p.px + p.w / 2 <= viewport.width && p.py - p.h / 2 >= 0 && p.py + p.h / 2 <= viewport.height
  const ordered = [...boxes.filter((b) => b.kind !== 'context'), ...boxes.filter((b) => b.kind === 'context')]
  let context = 0
  for (const b of ordered) {
    const mandatory = b.kind !== 'context'
    if (!mandatory && context >= contextLimit) continue
    const nudges = [0, -1, 1, -2, 2]
    let chosen: PlacedLabel | null = null
    for (const n of nudges) {
      const cand: PlacedLabel = { ...b, px: b.x, py: b.y + n * (b.h + gap) }
      if (!mandatory && !inside(cand)) continue
      if (placed.some((p) => overlaps(p, cand, gap))) continue
      chosen = cand
      break
    }
    if (!chosen && mandatory) chosen = { ...b, px: b.x, py: b.y }
    if (!chosen) continue
    placed.push(chosen)
    if (!mandatory) context++
  }
  return placed
}
