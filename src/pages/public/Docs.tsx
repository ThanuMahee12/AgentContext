import { Link, Navigate, useParams } from 'react-router-dom'

import { findDoc, sections, type Doc, type SectionId } from '../../content'
import { useAppSelector } from '../../store'
import Markdown, { slug } from '../../components/Markdown'
import { matches, Empty } from './shared'

interface Props {
  section: Extract<SectionId, 'notes' | 'kt'>
  title: string
  standfirst: string
}

/** Notes and KT are the same shape - a markdown document with headings - so
 *  they share a component and differ only in wording and colour. */
export default function Docs({ section, title, standfirst }: Props) {
  const { id } = useParams()
  // The section key and its URL differ now that the labels were renamed, so
  // links resolve through the section list rather than assuming they match.
  const basePath = sections.find((s) => s.id === section)?.path ?? `/${section}`
  const { query } = useAppSelector((s) => s.ui)
  const docs = useAppSelector((st) => st.content[section])

  if (id) {
    const doc = findDoc(docs, id)
    if (!doc) return <Navigate to={`/${section}`} replace />
    return <Reader doc={doc} section={section} basePath={basePath} title={title} />
  }

  const items = docs.filter((d) => matches(query, null, [d.title, d.body], []))

  return (
    <div className="page reveal" data-section={section}>
      <h1 className="pagetitle">{title}</h1>
      <p className="standfirst">{standfirst}</p>

      {items.length === 0 ? (
        <Empty query={query} tag={null} />
      ) : (
        <ul className="doclist">
          {items.map((d) => (
            <li key={d.id}>
              <Link to={`${basePath}/${d.id}`}>
                <strong>{d.title}</strong>
                {d.project && <span className="project">{d.project}</span>}
                <span className="size">{readingTime(d.bytes)}</span>
              </Link>
              {d.headings.length > 0 && (
                <p className="contents">
                  {d.headings.filter((h) => h.depth === 2).slice(0, 5).map((h) => h.text).join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Reader({
  doc,
  section,
  basePath,
  title,
}: {
  doc: Doc
  section: string
  basePath: string
  title: string
}) {
  const toc = doc.headings.filter((h) => h.depth === 2)
  return (
    <div className="page reveal reading" data-section={section}>
      <p className="crumb">
        <Link to={basePath}>← {title}</Link>
      </p>
      <h1 className="pagetitle">{doc.title}</h1>

      {toc.length > 2 && (
        <nav className="toc" aria-label="On this page">
          {toc.map((h) => (
            <a key={h.text} href={`#${slug(h.text)}`}>{h.text}</a>
          ))}
        </nav>
      )}

      <Markdown source={doc.body} />
    </div>
  )
}

/** Readers judge whether to start by how long it will take, not by byte count. */
function readingTime(bytes: number): string {
  const minutes = Math.max(1, Math.round(bytes / 5 / 220))
  return `${minutes} min read`
}
