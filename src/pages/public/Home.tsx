import { Link } from 'react-router-dom'

import { SECTION_KEY, sections, type SectionId } from '../../content'
import { useAppSelector } from '../../store'

/** The public overview.
 *
 *  An index of four links does not need a page; what a reader wants first is a
 *  sense of how much is here and where the weight sits. So this leads with the
 *  totals, then the split by volume, then the things actually worth opening.
 *
 *  Two things are deliberately NOT charted. Every dated item falls inside a
 *  three-day window, so a timeline would draw a trend that does not exist. And
 *  the most-used tag appears three times - encoding that as bar length is noise,
 *  so tags are entry points rather than a chart.
 */
export default function Home() {
  const content = useAppSelector((s) => s.content)

  const keys = ['brainstorms', 'kt', 'discussions', 'notes'] as const
  const rows = sections
    .filter((s) => s.id !== 'home')
    .map((s) => {
      const items = content[SECTION_KEY[s.id as Exclude<SectionId, 'home'>]]
      const words = items.reduce((n, i: any) => n + countWords(i.body ?? i.summary ?? ''), 0)
      return { ...s, count: items.length, words }
    })

  const totalItems = rows.reduce((n, r) => n + r.count, 0)
  const totalWords = rows.reduce((n, r) => n + r.words, 0)
  const widest = Math.max(...rows.map((r) => r.words), 1)

  const longest = keys
    .flatMap((k) => content[k] as any[])
    .map((d) => ({ ...d, words: countWords(d.body ?? d.summary ?? '') }))
    .filter((d) => d.body)
    .sort((a, b) => b.words - a.words)
    .slice(0, 5)

  const topics = tagCounts(content)

  return (
    <div className="page dash">
      <h1 className="pagetitle">Working knowledge</h1>
      <p className="standfirst">
        Notes, reference and half-finished ideas from building data pipelines — kept where they
        can be found again.
      </p>

      <dl className="figures">
        <div>
          <dt>Documents</dt>
          <dd>{totalItems}</dd>
        </div>
        <div>
          <dt>Words</dt>
          <dd>{formatK(totalWords)}</dd>
        </div>
        <div>
          <dt>Topics</dt>
          <dd>{topics.length}</dd>
        </div>
        <div>
          <dt>Reading</dt>
          <dd>{Math.round(totalWords / 220)}<span className="unit">min</span></dd>
        </div>
      </dl>

      {/* Magnitude across four named categories: a horizontal bar, direct
          labelled. Four series with their names beside them need no legend. */}
      <section className="panel">
        <h2>Where the weight sits</h2>
        <ul className="bars">
          {rows.map((r) => (
            <li key={r.id} data-section={r.id}>
              <Link to={r.path}>
                <span className="barlabel">{r.label}</span>
                <span className="track">
                  <span className="fill" style={{ width: `${Math.max(2, (r.words / widest) * 100)}%` }} />
                </span>
                <span className="barvalue">
                  {r.count}<span className="sep">·</span>{formatK(r.words)}w
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Longest reads</h2>
          <ol className="ranked">
            {longest.map((d) => (
              <li key={d.id} data-section={sectionOf(content, d.id)}>
                <Link to={`${pathOf(sectionOf(content, d.id))}/${d.path ?? d.id}`}>
                  <span className="t">{d.title}</span>
                  <span className="mins">{Math.max(1, Math.round(d.words / 220))} min</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2>Topics</h2>
          <p className="topics">
            {topics.slice(0, 14).map((t) => (
              <span className="topic" key={t.tag}>
                {t.tag}
                {t.count > 1 && <span className="c">{t.count}</span>}
              </span>
            ))}
          </p>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const countWords = (s: string) => (s ? s.trim().split(/\s+/).length : 0)
const formatK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

function tagCounts(content: any) {
  const counts = new Map<string, number>()
  for (const item of [...content.discussions, ...content.brainstorms]) {
    for (const t of item.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** Which section a document id belongs to, so a link can be built for it. */
function sectionOf(content: any, id: string): SectionId {
  for (const [key, section] of [
    ['brainstorms', 'brainstorms'],
    ['kt', 'kt'],
    ['discussions', 'discussions'],
    ['notes', 'notes'],
  ] as const) {
    if (content[key].some((i: any) => i.id === id)) return section as SectionId
  }
  return 'home'
}


const pathOf = (id: SectionId) => sections.find((s) => s.id === id)?.path ?? '/'
