import { Link, Navigate, useParams } from 'react-router-dom'

import { SECTION_KEY, sections, type SectionId } from '../../content'
import { useAppDispatch, useAppSelector } from '../../store'
import { toggleTag } from '../../store/uiSlice'
import Markdown from '../../components/Markdown'
import { matches, TagRow, Empty } from './shared'

type Key = Exclude<SectionId, 'home'>

/** One component for every section, in two views.
 *
 *  Sections used to diverge: brainstorms and ideas rendered every item inline
 *  on one page, while KT and commands had their own document pages. That made
 *  an idea impossible to link to and impossible to read on its own. Every item
 *  now has a page, and every section lists the same way.
 */
export default function Section({ id }: { id: Key }) {
  const { docId } = useParams()
  const meta = sections.find((s) => s.id === id)!
  const items = useAppSelector((s) => s.content[SECTION_KEY[id]]) as any[]

  if (docId) {
    const item = items.find((i) => i.id === docId)
    if (!item) return <Navigate to={meta.path} replace />
    return <Detail item={item} section={id} back={meta} />
  }

  return <List id={id} items={items} meta={meta} />
}

// ---------------------------------------------------------------------------

function List({ id, items, meta }: { id: Key; items: any[]; meta: any }) {
  const { query, tag } = useAppSelector((s) => s.ui)
  const shown = items.filter((i) =>
    matches(query, tag, [i.title, i.description ?? '', i.body ?? '', ...(i.tags ?? [])], i.tags ?? []),
  )

  return (
    <div className="page" data-section={id}>
      <h1 className="pagetitle">{meta.label}</h1>
      <p className="standfirst">{meta.blurb}</p>

      {shown.length === 0 ? (
        <Empty query={query} tag={tag} />
      ) : (
        <ul className="cards">
          {shown.map((i) => (
            <li key={i.id}>
              <Link to={`${meta.path}/${i.id}`}>
                <span className="head">
                  <span className="t">{i.title}</span>
                  {i.status && <span className="status">{i.status}</span>}
                </span>
                {(i.description || firstLine(i.body)) && (
                  <span className="d">{i.description || firstLine(i.body)}</span>
                )}
                <span className="foot">
                  {i.date && <time dateTime={i.date}>{i.date}</time>}
                  {i.project && <span className="project">{i.project}</span>}
                  <span className="mins">{readingTime(i)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Detail({ item, section, back }: { item: any; section: Key; back: any }) {
  const dispatch = useAppDispatch()
  const { tag } = useAppSelector((s) => s.ui)
  const toc = (item.headings ?? []).filter((h: any) => h.depth === 2)

  return (
    <article className="page reading" data-section={section}>
      <p className="crumb">
        <Link to={back.path}>{back.label}</Link>
      </p>

      <h1 className="pagetitle">{item.title}</h1>
      {item.description && <p className="standfirst">{item.description}</p>}

      <div className="meta">
        {item.date && <time dateTime={item.date}>{item.date}</time>}
        {item.status && <span className="status">{item.status}</span>}
        {item.project && <span className="project">{item.project}</span>}
        <span className="mins">{readingTime(item)}</span>
      </div>

      {(item.url || item.gist || item.notion) && (
        <p className="out">
          {item.url && <a href={item.url} target="_blank" rel="noreferrer noopener">Original thread</a>}
          {item.gist && <a href={item.gist} target="_blank" rel="noreferrer noopener">Gist</a>}
          {item.notion && <a href={item.notion} target="_blank" rel="noreferrer noopener">Notion</a>}
        </p>
      )}

      {toc.length > 2 && (
        <nav className="toc" aria-label="On this page">
          {toc.map((h: any) => (
            <a key={h.text} href={`#${slugify(h.text)}`}>{h.text}</a>
          ))}
        </nav>
      )}

      {item.body && <Markdown source={item.body} />}

      <TagRow tags={item.tags ?? []} active={tag} onPick={(t) => dispatch(toggleTag(t))} />
    </article>
  )
}

// ---------------------------------------------------------------------------

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** First prose line, skipping frontmatter leftovers, headings and media. */
function firstLine(body?: string): string {
  if (!body) return ''
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('|')) continue
    if (line.startsWith('```') || line.startsWith('>')) continue
    return line.replace(/[*_`]/g, '').slice(0, 160)
  }
  return ''
}

function readingTime(item: any): string {
  const words = (item.body ?? item.summary ?? '').trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 220))} min`
}
