import { useEffect, useId, useMemo, useRef, useState } from 'react'

/**
 * A multi-select filter as a dropdown.
 *
 * It was a row of toggle chips, which worked while a facet had four values and
 * fell apart at eighteen: the toolbar became a wall of chips and the table
 * below it lost the space. A menu costs one click and gives the row back.
 *
 * Three things the chip row could not do, all of which matter at that size:
 *   - the busiest values come first, by count rather than alphabetically, so
 *     the one holding most of the archive is not somewhere in the middle
 *   - a long list is searchable rather than scrolled
 *   - the button says how many are active without showing all of them
 */
export default function Facet({
  title,
  options,
  selected,
  onChange,
  counts,
  /** Above this many options the menu gets a search box. */
  searchAbove = 8,
}: {
  title: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  counts: Record<string, number>
  searchAbove?: number
}) {
  const [open, setOpen] = useState(false)
  const [needle, setNeedle] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const menuId = useId()

  // Close on a click anywhere else, and on Escape. Both are what a menu is
  // expected to do; neither happens for free on a div.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        // Back to the button, or focus is left on a node that just vanished.
        wrap.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /** Busiest first. Alphabetical put the value holding most of the archive
   *  wherever its name happened to fall. */
  const ordered = useMemo(
    () => [...options].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)),
    [options, counts],
  )

  const shown = useMemo(() => {
    const q = needle.trim().toLowerCase()
    return q ? ordered.filter((o) => o.toLowerCase().includes(q)) : ordered
  }, [ordered, needle])

  if (options.length === 0) return null

  const toggle = (option: string) =>
    onChange(
      selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option],
    )

  return (
    <div className="facet" ref={wrap}>
      <button
        type="button"
        className={'facetbtn' + (selected.length ? ' on' : '')}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((v) => !v)
          setNeedle('')
        }}
      >
        {title}
        {selected.length > 0 && <span className="n">{selected.length}</span>}
        <span className="caret" aria-hidden />
      </button>

      {open && (
        <div className="facetmenu" id={menuId} role="group" aria-label={title}>
          {options.length > searchAbove && (
            <input
              type="search"
              className="facetfind"
              value={needle}
              autoFocus
              placeholder={`Filter ${title.toLowerCase()}…`}
              aria-label={`Filter ${title.toLowerCase()}`}
              onChange={(e) => setNeedle(e.target.value)}
            />
          )}

          <div className="facetlist">
            {shown.map((o) => (
              <label key={o}>
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                <span className="name">{o}</span>
                <span className="count">{counts[o] ?? 0}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="facetnone">Nothing matches.</p>}
          </div>

          {selected.length > 0 && (
            <button type="button" className="facetclear" onClick={() => onChange([])}>
              Clear {selected.length} selected
            </button>
          )}
        </div>
      )}
    </div>
  )
}
