/**
 * Pure per-node render style computation (no Three.js). The engine maps the result onto
 * materials and mesh flags.
 *
 * Colour never carries meaning on its own: selection and highlights are also reflected in
 * labels, the info card and the live region (see ViewerCanvas).
 */
import { isSelectable, type EffectiveVisibility } from '../state/visibility.ts'
import type { HighlightStyle } from './types.ts'

/** Neutral surface colour used when a structure's system has no colour record. */
export const DEFAULT_BASE_COLOR = '#d8cfc4'
/** Flat colour of the clipping cap. Uniform on purpose: it is a surface clip, not volume data. */
export const CAP_COLOR = '#b9b2a8'

export const SELECTION_COLOR = '#ffb300'
export const HOVER_COLOR = '#ffffff'

export const HIGHLIGHT_COLORS: Record<HighlightStyle, string> = {
  relation: '#339af0',
  lesson: '#12b886',
  quiz_target: '#be4bdb',
  quiz_correct: '#2f9e44',
  quiz_wrong: '#e03131',
}

/** When a structure is in several highlight sets, the first style in this list wins. */
export const HIGHLIGHT_PRIORITY: readonly HighlightStyle[] = ['quiz_wrong', 'quiz_correct', 'quiz_target', 'lesson', 'relation']

export function pickHighlight(styles: Iterable<HighlightStyle>): HighlightStyle | null {
  const set = new Set(styles)
  for (const s of HIGHLIGHT_PRIORITY) if (set.has(s)) return s
  return null
}

export interface NodeStyleInput {
  vis: EffectiveVisibility
  /** Hidden because a loaded detail model replaces this node. */
  replaced: boolean
  selected: boolean
  hovered: boolean
  highlight: HighlightStyle | null
}

export interface NodeStyle {
  visible: boolean
  opacity: number
  transparent: boolean
  depthWrite: boolean
  /** Hex colour added as emissive tint (selection / highlight / hover). */
  emissive: string
  emissiveIntensity: number
  /** Can be picked with the pointer. */
  selectable: boolean
  /** Rendered as ghost (preferred less when picking). */
  ghost: boolean
  /** Opaque solid that contributes to the clipping cap stencil. */
  solid: boolean
}

export function computeNodeStyle(input: NodeStyleInput): NodeStyle {
  const { vis, replaced } = input
  const rendered = !replaced && (vis.mode === 'visible' || vis.mode === 'ghost') && vis.opacity > 0.001
  const opacity = rendered ? Math.min(1, Math.max(0, vis.opacity)) : 0
  const transparent = rendered && opacity < 0.999
  let emissive = '#000000'
  let emissiveIntensity = 0
  if (rendered) {
    if (input.highlight) {
      emissive = HIGHLIGHT_COLORS[input.highlight]
      emissiveIntensity = 0.55
    } else if (input.selected) {
      emissive = SELECTION_COLOR
      emissiveIntensity = 0.45
    } else if (input.hovered) {
      emissive = HOVER_COLOR
      emissiveIntensity = 0.12
    }
  }
  return {
    visible: rendered,
    opacity,
    transparent,
    depthWrite: !transparent,
    emissive,
    emissiveIntensity,
    selectable: rendered && isSelectable(vis),
    ghost: rendered && vis.mode === 'ghost',
    solid: rendered && !transparent,
  }
}

export const styleKey = (s: NodeStyle): string =>
  `${s.visible ? 1 : 0}|${s.opacity.toFixed(3)}|${s.emissive}|${s.emissiveIntensity}`

/** FNV-1a 32-bit hash (deterministic per node name). */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const parseHex = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  const v = m ? parseInt(m[1]!, 16) : 0xd8cfc4
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const toHex = (rgb: [number, number, number]): string =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

/**
 * Small deterministic lightness variation per node so that neighbouring structures of the
 * same system remain distinguishable. Purely visual; carries no anatomical meaning.
 */
export function jitterColor(hex: string, key: string, amount = 0.07): string {
  const rgb = parseHex(hex)
  const u = (hashString(key) % 1000) / 999 // 0..1
  const f = 1 + (u * 2 - 1) * amount
  return toHex([rgb[0] * f, rgb[1] * f, rgb[2] * f])
}
