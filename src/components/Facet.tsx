/** A checkbox filter group with per-option counts.
 *
 *  Generic over whatever the options are strings for - it never sees a session.
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

  const toggle = (option: string, on: boolean) =>
    onChange(on ? [...selected, option] : selected.filter((x) => x !== option))

  return (
    <div className="facet">
      <h3>{title}</h3>
      {options.map((o) => (
        <label key={o}>
          <input
            type="checkbox"
            checked={selected.includes(o)}
            onChange={(e) => toggle(o, e.target.checked)}
          />
          <span>{o}</span>
          <span className="count">{counts[o] ?? 0}</span>
        </label>
      ))}
    </div>
  )
}
