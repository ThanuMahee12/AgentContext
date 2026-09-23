import { useMemo, useState } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'

import { inputSm, linkButton, menuPanel, outlineButton } from '../lib/ui'

/**
 * A multi-select filter as a dropdown.
 *
 * It was a row of toggle chips, which worked while a facet had four values and
 * fell apart at eighteen: the toolbar became a wall of chips and the table
 * below it lost the space. A menu costs one click and gives the row back.
 *
 * The open/close behaviour is Headless UI's, not ours. This component used to
 * hand-roll it: a ref on the wrapper, a `pointerdown` listener to catch clicks
 * outside, a `keydown` listener for Escape, and a manual `focus()` back onto
 * the button afterwards. All of that is what `Popover` is, and the library's
 * version also does the focus handling we never wrote.
 *
 * What stays ours is the part that is about this data rather than about menus:
 *   - the busiest values first, by count rather than alphabetically, so the one
 *     holding most of the archive is not somewhere in the middle
 *   - a long list searchable rather than scrolled
 *   - the button saying how many are active without showing all of them
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
  const [needle, setNeedle] = useState('')

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
    <Popover className="relative">
      <PopoverButton
        // Clearing the search on open, not on close: a menu that reopens
        // still filtered by something typed a minute ago looks empty for no
        // visible reason.
        onClick={() => setNeedle('')}
        className={
          `${outlineButton} data-[open]:border-hue data-[open]:text-text ` +
          (selected.length ? 'border-hue bg-hue/15 text-text' : '')
        }
      >
        {title}
        {selected.length > 0 && (
          <span className="min-w-4 rounded-full bg-hue px-[5px] font-mono text-[10.5px] font-semibold leading-normal tabular-nums text-ground">
            {selected.length}
          </span>
        )}
        <span
          aria-hidden
          className="border-x-[3.5px] border-t-4 border-x-transparent border-t-current"
        />
      </PopoverButton>

      <PopoverPanel
        // anchor places it against the button and keeps it on screen; the hand
        // -rolled version was absolutely positioned and would have run off the
        // edge for the last filter in the row.
        anchor={{ to: 'bottom start', gap: 6 }}
        className={menuPanel}
      >
        <div role="group" aria-label={title}>
          {options.length > searchAbove && (
            <input
              type="search"
              value={needle}
              autoFocus
              placeholder={`Filter ${title.toLowerCase()}…`}
              aria-label={`Filter ${title.toLowerCase()}`}
              onChange={(e) => setNeedle(e.target.value)}
              className={`${inputSm} mb-1.5 w-full bg-raised`}
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
              className={`${linkButton} mt-1.5 w-full border-0 border-t border-line bg-transparent p-[7px]`}
              onClick={() => onChange([])}
            >
              Clear {selected.length} selected
            </button>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  )
}
