/**
 * Search combobox (WAI-ARIA combobox + listbox). Choosing a hit selects the structure,
 * makes it visible again if it was hidden/dissected/isolated away, and focuses the camera.
 */
import { useId, useMemo, useState } from 'react'
import type { SearchHit } from '../../search/types.ts'
import { LATERALITY_LABEL } from '../../i18n/labels.ts'
import { useServices } from '../services.tsx'

export function SearchBox() {
  const { search, store, engine, index } = useServices()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim()
    if (!search || q.length === 0) return []
    return search.search(q, { limit: 12 })
  }, [search, query])

  const choose = (hit: SearchHit) => {
    const api = store.getState()
    if (hit.hasModel) api.reveal([hit.id])
    api.select([hit.id])
    if (hit.hasModel) engine?.focusStructures([hit.id])
    setOpen(false)
    setQuery(index.displayName(hit.id))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setOpen(true)
      setActive((a) => Math.min(hits.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      const hit = hits[active]
      if (hit) choose(hit)
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else {
      return
    }
    e.preventDefault()
  }

  const showList = open && query.trim().length > 0
  return (
    <div className="search-box">
      <label htmlFor={`${listId}-input`} className="visually-hidden">
        Yapı ara
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        placeholder={search ? 'Yapı ara (TR / LA / EN)…' : 'Arama hazırlanıyor…'}
        disabled={!search}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={listId} role="listbox" className="search-results" aria-label="Arama sonuçları">
          {hits.length === 0 && (
            <li role="option" aria-selected={false} aria-disabled="true" className="muted">
              Sonuç bulunamadı
            </li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(h)}
            >
              <span>{h.nameTr ?? h.nameEn}</span>
              {h.nameLa && <span className="muted small" lang="la"> · {h.nameLa}</span>}
              {h.matchedKind === 'synonym' && <span className="muted small"> (eş anlamlı: {h.matchedText})</span>}
              {h.laterality === 'left' || h.laterality === 'right' ? (
                <span className="badge">{LATERALITY_LABEL[h.laterality]}</span>
              ) : null}
              {!h.hasModel && <span className="badge warn">3B model yok</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
