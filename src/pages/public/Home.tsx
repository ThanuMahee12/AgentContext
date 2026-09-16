import { Link } from 'react-router-dom'

import { content, sections, totalItems } from '../../content'

/** The index. Its job is to show what is here and get you into it, so it
 *  leads with the actual inventory rather than a statement about the site. */
export default function Home() {
  const recent = [
    ...content.discussions.map((d) => ({ kind: 'discussions' as const, id: d.id, title: d.title, date: d.date, note: d.summary })),
    ...content.brainstorms.map((b) => ({ kind: 'brainstorms' as const, id: b.id, title: b.title, date: b.date, note: b.summary })),
  ]
    .filter((x) => x.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)

  return (
    <div className="page reveal">
      <h1 className="pagetitle">
        {totalItems} pieces of working knowledge
      </h1>
      <p className="standfirst">
        Data-pipeline notes, reference material and half-finished ideas, kept where they can be
        found again.
      </p>

      <ul className="index">
        {sections
          .filter((s) => s.id !== 'home')
          .map((s) => (
            <li key={s.id} data-section={s.id}>
              <Link to={s.path}>
                <span className="n">{s.count}</span>
                <span className="body">
                  <strong>{s.label}</strong>
                  <span>{s.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>

      {recent.length > 0 && (
        <section className="recent">
          <h2>Most recent</h2>
          <ul>
            {recent.map((r) => (
              <li key={`${r.kind}-${r.id}`} data-section={r.kind}>
                <Link to={`/${r.kind}#${r.id}`}>
                  <time dateTime={r.date}>{r.date}</time>
                  <strong>{r.title}</strong>
                </Link>
                <p>{clamp(r.note, 150)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function clamp(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s
}
