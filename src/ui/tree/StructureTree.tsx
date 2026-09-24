/**
 * System and region trees (ARIA tree pattern). Children render lazily when expanded, so
 * large hierarchies stay cheap. Each structure row selects on click and has a visibility
 * toggle showing the effective state (incl. why a structure is hidden).
 */
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { SYSTEM_IDS, type RegionRecord, type Structure, type StructureId, type SystemId, type VisibilityMode } from '../../core/schema.ts'
import { HIDDEN_REASON_LABEL, resolveVisibility } from '../../state/visibility.ts'
import { useScene, useServices } from '../services.tsx'
import { isSystemOn } from '../systems.ts'

const NEXT_MODE: Record<VisibilityMode, VisibilityMode> = { visible: 'ghost', ghost: 'hidden', hidden: 'visible' }
const MODE_ICON: Record<VisibilityMode | 'absent', string> = { visible: '●', ghost: '◐', hidden: '○', absent: '·' }
const MODE_TEXT: Record<VisibilityMode | 'absent', string> = {
  visible: 'görünür',
  ghost: 'saydam',
  hidden: 'gizli',
  absent: 'modelde yok',
}

/** Arrow-key navigation across the visible tree items (WAI-ARIA tree pattern). */
function onTreeKeyDown(e: KeyboardEvent<HTMLUListElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]')]
  const cur = items.indexOf(document.activeElement as HTMLElement)
  const item = items[cur]
  if (!item) return
  const focusAt = (i: number) => items[Math.max(0, Math.min(items.length - 1, i))]?.focus()
  switch (e.key) {
    case 'ArrowDown':
      focusAt(cur + 1)
      break
    case 'ArrowUp':
      focusAt(cur - 1)
      break
    case 'Home':
      focusAt(0)
      break
    case 'End':
      focusAt(items.length - 1)
      break
    case 'ArrowRight':
      if (item.getAttribute('aria-expanded') === 'false') item.querySelector<HTMLElement>('.tree-toggle')?.click()
      else focusAt(cur + 1)
      break
    case 'ArrowLeft':
      if (item.getAttribute('aria-expanded') === 'true') item.querySelector<HTMLElement>('.tree-toggle')?.click()
      else item.parentElement?.closest<HTMLElement>('[role="treeitem"]')?.focus()
      break
    case 'Enter':
    case ' ':
      item.querySelector<HTMLElement>('.tree-label')?.click()
      break
    default:
      return
  }
  e.preventDefault()
  e.stopPropagation()
}

interface RowProps {
  level: number
  label: ReactNode
  hasChildren: boolean
  selected?: boolean
  onActivate?: () => void
  actions?: ReactNode
  renderChildren: () => ReactNode
  defaultExpanded?: boolean
}

function TreeRow({ level, label, hasChildren, selected, onActivate, actions, renderChildren, defaultExpanded }: RowProps) {
  const [expanded, setExpanded] = useState(!!defaultExpanded)
  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selected ?? false}
      tabIndex={level === 1 ? 0 : -1}
      className="tree-item"
    >
      <div className="tree-row" style={{ paddingInlineStart: `${(level - 1) * 14}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-toggle" aria-hidden="true" />
        )}
        <span className="tree-label" onClick={onActivate ?? (() => setExpanded((x) => !x))}>
          {label}
        </span>
        {actions}
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="tree-group">
          {renderChildren()}
        </ul>
      )}
    </li>
  )
}

function StructureRow({ s, level, childrenOf }: { s: Structure; level: number; childrenOf: (id: StructureId) => Structure[] }) {
  const { index, store, engine, settings } = useServices()
  const scene = useScene((st) => st.scene)
  const vis = resolveVisibility(s.id, scene, index)
  const kids = childrenOf(s.id)
  const name = index.displayName(s.id, settings.nameLanguage)
  const stateText = vis.reason ? `${MODE_TEXT[vis.mode]}: ${HIDDEN_REASON_LABEL[vis.reason]}` : MODE_TEXT[vis.mode]

  const select = () => {
    store.getState().select([s.id])
    if (vis.mode !== 'absent') engine?.focusStructures([s.id])
  }
  const cycle = () => {
    const cur = vis.mode === 'absent' ? 'visible' : vis.mode
    const next = vis.reason === 'dissected' || vis.reason === 'isolation' ? 'visible' : NEXT_MODE[cur]
    if (next === 'visible' && vis.mode === 'hidden') store.getState().reveal([s.id])
    else store.getState().setVisibility([s.id], next)
  }

  return (
    <TreeRow
      level={level}
      hasChildren={kids.length > 0}
      selected={scene.selected.includes(s.id)}
      onActivate={select}
      label={<span className={vis.mode === 'absent' ? 'muted' : undefined}>{name}</span>}
      actions={
        <button
          type="button"
          className="icon-btn vis-btn"
          tabIndex={-1}
          disabled={vis.mode === 'absent'}
          title={stateText}
          aria-label={`${name}: ${stateText}. Görünürlüğü değiştir`}
          onClick={cycle}
        >
          {MODE_ICON[vis.mode]}
        </button>
      }
      renderChildren={() => kids.map((k) => <StructureRow key={k.id} s={k} level={level + 1} childrenOf={childrenOf} />)}
    />
  )
}

export function SystemTree() {
  const { index, store } = useServices()
  const scene = useScene((st) => st.scene)
  const systems = [...index.bundle.systems].sort((a, b) => SYSTEM_IDS.indexOf(a.id) - SYSTEM_IDS.indexOf(b.id))
  const childrenOf = (id: StructureId) => index.childrenOf(id)

  if (systems.length === 0) return <p className="muted">Henüz sistem tanımı yüklenmedi.</p>
  return (
    <ul role="tree" aria-label="Sistemlere göre yapılar" className="tree" onKeyDown={onTreeKeyDown}>
      {systems.map((sys) => {
        const roots = index.systemRoots(sys.id)
        const on = isSystemOn(scene, sys.id)
        return (
          <TreeRow
            key={sys.id}
            level={1}
            hasChildren={roots.length > 0}
            label={
              <>
                <span className="swatch" style={{ background: sys.color }} aria-hidden="true" />
                {sys.name.tr} <span className="count">({roots.length})</span>
              </>
            }
            actions={
              <label className="sys-toggle" title={on ? 'Sistemi kapat' : 'Sistemi aç (modelleri yükler)'}>
                <input
                  type="checkbox"
                  tabIndex={-1}
                  checked={on}
                  aria-label={`${sys.name.tr} görünür`}
                  onChange={(e) => store.getState().setSystemVisible(sys.id as SystemId, e.target.checked)}
                />
              </label>
            }
            renderChildren={() => roots.map((r) => <StructureRow key={r.id} s={r} level={2} childrenOf={childrenOf} />)}
          />
        )
      })}
    </ul>
  )
}

export function RegionTree() {
  const { index } = useServices()
  const regions = index.bundle.regions
  const byParent = new Map<string | undefined, RegionRecord[]>()
  for (const r of regions) {
    const list = byParent.get(r.parentId) ?? []
    list.push(r)
    byParent.set(r.parentId, list)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order)

  // Structures directly assigned to a region, excluding those whose parent is in the same region.
  const direct = (regionId: string) =>
    index.bundle.structures.filter(
      (s) => s.regions.includes(regionId) && !s.parentIds.some((p) => index.getStructure(p)?.regions.includes(regionId)),
    )
  // Inside a region, only descend into children that belong to the same region.
  const childrenIn = (regionId: string) => (id: StructureId) =>
    index.childrenOf(id).filter((c) => c.regions.includes(regionId))

  const renderRegion = (r: RegionRecord, level: number): ReactNode => {
    const subs = byParent.get(r.id) ?? []
    const own = direct(r.id)
    return (
      <TreeRow
        key={r.id}
        level={level}
        hasChildren={subs.length + own.length > 0}
        label={r.name.tr}
        renderChildren={() => [
          ...subs.map((sr) => renderRegion(sr, level + 1)),
          ...own.map((s) => <StructureRow key={s.id} s={s} level={level + 1} childrenOf={childrenIn(r.id)} />),
        ]}
      />
    )
  }

  const tops = byParent.get(undefined) ?? []
  if (tops.length === 0) return <p className="muted">Henüz bölge tanımı yüklenmedi.</p>
  return (
    <ul role="tree" aria-label="Bölgelere göre yapılar" className="tree" onKeyDown={onTreeKeyDown}>
      {tops.map((r) => renderRegion(r, 1))}
    </ul>
  )
}
