/** A filter group as a row of toggles.
 *
 *  It was a column of checkboxes in a sidebar. Without the sidebar it is a
 *  row, and real `<button aria-pressed>` rather than checkboxes: a filter
 *  chip that shows its own state is the thing a checkbox list could not do
 *  once it stopped being permanently visible.
 *
 *  Renders nothing when there are no options, so a facet for a field no record
 *  has does not leave an empty heading behind.
 */
export default function Facet({
  title,
  options,
  selected,
  onChange,
  counts,
}: {
  title: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  counts: Record<string, number>
}) {
  if (options.length === 0) return null

  const toggle = (option: string) =>
    onChange(
      selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option],
    )

  return (
    <div className="facet" role="group" aria-label={title}>
      <h3>{title}</h3>
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            className={'fchip' + (on ? ' on' : '')}
            aria-pressed={on}
            onClick={() => toggle(o)}
          >
            {o}
            <span className="count">{counts[o] ?? 0}</span>
          </button>
        )
      })}
    </div>
  )
}
