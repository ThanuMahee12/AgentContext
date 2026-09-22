import { truncate } from '../lib/format'
import type { ContextItem } from '../types'

/** Links AgentProbe extracted from transcripts, as a row of chips.
 *
 *  `accent` marks anything that is not a plain web link - a ClickUp ticket, a
 *  sheet, a Slack thread - because those are the ones worth spotting in a row
 *  of thirty.
 *
 *  These open off-site, so every one carries `rel="noreferrer noopener"`: the
 *  URLs come out of captured sessions and are not vetted, and `target="_blank"`
 *  without `noopener` hands the opened page a handle on this one.
 */
export default function LinkRow({ items }: { items: ContextItem[] }) {
  if (!items.length) return null
  return (
    <div className="links">
      {items.map((c) => (
        <a
          className={'chip' + (c.source !== 'web' ? ' accent' : '')}
          key={c.doc_id}
          href={c.url}
          target="_blank"
          rel="noreferrer noopener"
          title={c.url}
        >
          {c.source}
          {c.external_id && <span style={{ opacity: 0.75 }}>{truncate(c.external_id, 28)}</span>}
          {c.mention_count > 1 && <span style={{ opacity: 0.55 }}>×{c.mention_count}</span>}
        </a>
      ))}
    </div>
  )
}
