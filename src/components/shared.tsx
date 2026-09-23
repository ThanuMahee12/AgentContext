/** Pieces every public section needs, kept together so the sections stay
 *  about their content rather than repeating chrome. */

export function matches(
  query: string,
  tag: string | null,
  haystack: string[],
  tags: string[],
): boolean {
  if (tag && !tags.includes(tag)) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = haystack.join(' ').toLowerCase()
  return q.split(/\s+/).every((term) => hay.includes(term))
}

export function TagRow({
  tags,
  active,
  onPick,
}: {
  tags: string[]
  active: string | null
  onPick: (tag: string) => void
}) {
  if (!tags?.length) return null
  return (
    <p className="tags">
      {tags.map((t) => (
        <button
          key={t}
          className={'tag' + (active === t ? ' on' : '')}
          onClick={() => onPick(t)}
          aria-pressed={active === t}
        >
          {t}
        </button>
      ))}
    </p>
  )
}

/** An empty result is a dead end unless it says how to get out of it.
 *
 *  A section with no content at all is a different thing from a filter that
 *  matched nothing, and telling someone to clear a search they did not type is
 *  worse than saying nothing. */
export function Empty({ query, tag }: { query: string; tag: string | null }) {
  const bits = [query && `“${query}”`, tag && `tag ${tag}`].filter(Boolean)
  if (!bits.length) {
    return <p className="nothing">Nothing here yet.</p>
  }
  return (
    <p className="nothing">
      Nothing here matches {bits.join(' and ')}. Clear the search or pick a different tag.
    </p>
  )
}
