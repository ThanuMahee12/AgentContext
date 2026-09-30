import { Link } from 'react-router-dom'

import { Skeleton } from '../components/State'
import Title from '../components/Title'
import { countWords, formatCompact, formatDate } from '../lib/format'
import { sections, type KindId } from '../lib/sections'
import { useContent } from '../lib/useContent'

/**
 * The public overview.
 *
 * It used to be five blocks: four stat tiles (documents, words, topics,
 * reading time), a bar chart of words per section, a "longest reads" list and
 * fourteen topic chips. Three of those were answering questions nobody asks.
 *
 *   - The bar chart restated the nav, which already carries a count beside
 *     every section.
 *   - "Words" and "reading time" are vanity figures on a personal archive;
 *     nothing is decided differently because the total is 41k rather than 38k.
 *   - "Longest reads" ranked by word count, which is not the same as worth
 *     reading, and the topic chips were not clickable - decoration in the
 *     shape of a filter.
 *
 * What is left is the one thing the nav cannot do: say what each section is
 * for. The blurbs have existed in sections.ts all along and only ever appeared
 * once you were already inside a section - which is exactly too late.
 */
export default function Home() {
  const { content, ready } = useContent()

  const rows = sections
    .filter((s) => s.id !== 'home')
    .map((s) => {
      const items = content[s.id as KindId] as {
        body?: string
        summary?: string
      }[]
      return {
        ...s,
        count: items.length,
        words: items.reduce((n, d) => n + countWords(d.body ?? d.summary), 0),
      }
    })

  const total = rows.reduce((n, r) => n + r.count, 0)

  // The five most recently dated documents, whatever section they sit in. The
  // index below says what each section is FOR; this says what has changed,
  // which is the question a returning reader actually arrives with.
  const latest = sections
    .filter((s) => s.id !== 'home')
    .flatMap((s) =>
      (
        content[s.id as KindId] as {
          id: string
          path?: string
          title: string
          date?: string
        }[]
      ).map((d) => ({ ...d, section: s })),
    )
    .filter((d) => d.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)

  return (
    <div className="page tw-scope">
      {/* Home is the brand alone - "Agentix · Agentix" helps nobody. */}
      <Title />

      <h1 className="pagetitle">Working knowledge</h1>
      <p className="standfirst">
        Notes, reference and half-finished ideas from building data pipelines — kept where they can
        be found again.
      </p>

      {!ready ? (
        <Skeleton rows={4} title={false} />
      ) : (
        <>
          {latest.length > 0 && (
            <section className="mt-2 mb-10">
              <h2 className="mb-3 text-[11px] font-semibold tracking-[0.09em] text-text-muted uppercase">
                Latest
              </h2>
              <ul className="list-none space-y-px p-0">
                {latest.map((d) => (
                  <li key={`${d.section.id}/${d.id}`}>
                    <Link
                      to={`${d.section.path}/${d.path ?? d.id}`}
                      className="group flex items-baseline gap-4 rounded-s border-l-2 border-transparent px-3 py-3 no-underline hover:border-hue hover:bg-surface"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-text group-hover:text-hue-lit">
                        {d.title}
                      </span>
                      <span className="hidden flex-none text-[12px] text-text-muted sm:inline">
                        {d.section.label}
                      </span>
                      <time
                        dateTime={d.date}
                        className="flex-none font-mono text-[12px] text-text-muted tabular-nums"
                      >
                        {formatDate(d.date ?? '')}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* One figure, in a sentence, rather than four tiles of which three
              were never acted on. */}
          <p className="text-[13px] text-text-muted">
            {total} document{total === 1 ? '' : 's'} across {rows.length} sections.
          </p>

          <ul className="mt-6 list-none space-y-px p-0">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={r.path}
                  className="group flex items-baseline gap-4 rounded-s px-3 py-4 no-underline hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-[-0.01em] text-text">
                      {r.label}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-text-2">
                      {r.blurb}
                    </span>
                  </span>
                  {/* Tabular so the counts line up down the column; the word total
                  is the quieter of the two because it is the less useful. */}
                  <span className="flex-none text-right font-mono text-[12px] text-text-muted tabular-nums">
                    {r.count}
                    <span className="ml-2 opacity-60">{formatCompact(r.words)}w</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
