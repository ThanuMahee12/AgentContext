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
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className={
          'inline-flex cursor-pointer items-center gap-[7px] rounded-s px-[11px] py-1.5 ' +
          'text-[12.5px] font-medium hover:border-hue hover:text-text ' +
          // field-line, not line: a control's edge needs 3:1 and --line is
          // 1.37:1 against the ground.
          'border border-field-line aria-expanded:border-hue aria-expanded:text-text ' +
          (selected.length ? 'border-hue bg-hue/15 text-text' : 'text-text-2')
        }
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((v) => !v)
          setNeedle('')
        }}
      >
        {title}
        {/* The button says how many are active without listing them. */}
        {selected.length > 0 && (
          <span className="min-w-4 rounded-full bg-hue px-[5px] font-mono text-[10.5px] font-semibold leading-normal tabular-nums text-ground">
            {selected.length}
          </span>
        )}
        <span
          aria-hidden
          className="border-x-[3.5px] border-t-4 border-x-transparent border-t-current"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-20 w-max min-w-[210px] max-w-[320px] rounded border border-line-lit bg-surface p-2 shadow-[0_14px_36px_-16px_rgb(0_0_0/0.9)]"
          id={menuId}
          role="group"
          aria-label={title}
        >
          {options.length > searchAbove && (
            <input
              type="search"
              className="mb-1.5 h-8 w-full rounded-s border border-field-line bg-raised px-[9px] text-[13px] text-text outline-none focus:border-hue"
              value={needle}
              autoFocus
              placeholder={`Filter ${title.toLowerCase()}…`}
              aria-label={`Filter ${title.toLowerCase()}`}
              onChange={(e) => setNeedle(e.target.value)}
            />
          )}

          {/* Capped and scrolled: eighteen values must not push the menu off screen. */}
          <div className="max-h-[264px] overflow-y-auto overscroll-contain">
            {shown.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-[9px] rounded-s px-[7px] py-[5px] text-[13px] leading-tight text-text-2 hover:bg-raised hover:text-text"
              >
                <input
                  type="checkbox"
                  className="m-0 flex-none accent-[--hue]"
                  checked={selected.includes(o)}
                  onChange={() => toggle(o)}
                />
                {/* The value can be long; the count must never be pushed out of sight. */}
                <span className="min-w-0 grow truncate">{o}</span>
                <span className="flex-none font-mono text-[11px] tabular-nums text-text-muted">
                  {counts[o] ?? 0}
                </span>
              </label>
            ))}
            {shown.length === 0 && (
              <p className="m-0 px-[7px] py-2 text-[12.5px] text-text-muted">Nothing matches.</p>
            )}
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              className="mt-1.5 w-full cursor-pointer border-0 border-t border-line bg-transparent p-[7px] text-[12.5px] font-medium text-hue-lit hover:text-text"
              onClick={() => onChange([])}
            >
              Clear {selected.length} selected
            </button>
          )}
        </div>
      )}
    </div>
  )
}
