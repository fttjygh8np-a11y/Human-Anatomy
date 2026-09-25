/**
 * Disclosure popover for the scene dock: a toggle button (aria-expanded) and a panel that
 * closes on Escape (focus returns to the button) or on a pointer press outside.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './icons.tsx'

export function Popover({
  icon,
  label,
  title,
  active = false,
  children,
}: {
  icon: IconName
  label: string
  title: string
  /** Shows a dot on the button (e.g. clipping is on); the state itself is exposed inside the panel. */
  active?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      btnRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="popover" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="dock-btn"
        aria-expanded={open}
        aria-controls={id}
        title={title}
        onClick={() => setOpen((x) => !x)}
      >
        <Icon name={icon} />
        <span className="dock-label">{label}</span>
        {active && <span className="dock-dot" aria-hidden="true" />}
      </button>
      <div id={id} className="popover-panel" role="group" aria-label={title} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
