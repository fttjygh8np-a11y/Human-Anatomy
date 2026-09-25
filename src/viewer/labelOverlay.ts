/**
 * HTML overlay that renders leader-free structure labels above the canvas.
 * Elements are reused between frames; text is set with textContent (never HTML).
 */
import type { StructureId } from '../core/schema.ts'
import type { LabelKind, PlacedLabel } from './labels.ts'

interface LabelEl {
  el: HTMLDivElement
  text: string
  kind: LabelKind
  w: number
  h: number
}

const BASE_STYLE = [
  'position:absolute',
  'left:0',
  'top:0',
  'white-space:nowrap',
  'pointer-events:none',
  'font:500 12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  'padding:2px 6px',
  'border-radius:4px',
  'color:var(--viewer-label-fg,#fff)',
  'background:var(--viewer-label-bg,rgba(24,28,33,.78))',
  'will-change:transform',
].join(';')

const KIND_STYLE: Record<LabelKind, string> = {
  selected: 'font-weight:700;outline:2px solid var(--viewer-label-selected,#ffb300);outline-offset:0',
  emphasis: 'font-weight:600;outline:1px dashed var(--viewer-label-emphasis,#74c0fc);outline-offset:0',
  context: 'opacity:.92',
}

export class LabelOverlay {
  readonly root: HTMLDivElement
  private readonly els = new Map<StructureId, LabelEl>()

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.dataset.viewerLabels = ''
    this.root.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict'
    container.appendChild(this.root)
  }

  /** Measured size of a label (created on demand, cached per id+text). */
  measure(id: StructureId, text: string, kind: LabelKind): { w: number; h: number } {
    const e = this.ensure(id, text, kind)
    return { w: e.w, h: e.h }
  }

  private ensure(id: StructureId, text: string, kind: LabelKind): LabelEl {
    let e = this.els.get(id)
    if (!e) {
      const el = document.createElement('div')
      el.style.cssText = BASE_STYLE
      el.style.visibility = 'hidden'
      this.root.appendChild(el)
      e = { el, text: '', kind, w: 0, h: 0 }
      this.els.set(id, e)
    }
    if (e.text !== text || e.kind !== kind || e.w === 0) {
      e.el.textContent = text
      e.el.style.cssText = `${BASE_STYLE};${KIND_STYLE[kind]};visibility:${e.el.style.visibility || 'hidden'}`
      e.text = text
      e.kind = kind
      const r = e.el.getBoundingClientRect()
      // jsdom / detached layouts report 0; fall back to an estimate.
      e.w = r.width > 0 ? r.width : text.length * 7 + 12
      e.h = r.height > 0 ? r.height : 20
    }
    return e
  }

  render(placed: readonly PlacedLabel[]): void {
    const keep = new Set<StructureId>()
    for (const p of placed) {
      const e = this.els.get(p.id)
      if (!e) continue
      keep.add(p.id)
      e.el.style.transform = `translate(${Math.round(p.px - e.w / 2)}px, ${Math.round(p.py - e.h / 2)}px)`
      e.el.style.visibility = 'visible'
    }
    for (const [id, e] of this.els) {
      if (keep.has(id)) continue
      e.el.style.visibility = 'hidden'
    }
    // Bound memory: drop long-unused elements when the cache grows large.
    if (this.els.size > 200) {
      for (const [id, e] of this.els) {
        if (keep.has(id)) continue
        e.el.remove()
        this.els.delete(id)
      }
    }
  }

  clear(): void {
    for (const e of this.els.values()) e.el.style.visibility = 'hidden'
  }

  dispose(): void {
    this.els.clear()
    this.root.remove()
  }
}
