import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { resolveRef, sections, type Doc, type KindId } from '../lib/sections'
import { useAppDispatch, useAppSelector } from '../store'
import { useContent, type Sections } from '../lib/useContent'
import { toggleTag } from '../store/uiSlice'
import Markdown, { slug as slugify } from '../components/Markdown'
import { Skeleton } from '../components/State'
import { formatDate, readingMinutes } from '../lib/format'
import Title from '../components/Title'
import Tree from '../components/Tree'
import { matches, TagRow, Empty } from '../components/shared'

type Key = KindId

/** One component for every section, resolving a path of any depth.
 *
 *  /tech-commands                      the section
 *  /tech-commands/data-alchemy         a folder
 *  /tech-commands/data-alchemy/bbocax  a deeper folder
 *  /tech-commands/data-alchemy/bbocax/mapping   a document
 *
 *  Folder and document share a URL space, so a path is resolved by looking for
 *  a document first and treating it as a folder otherwise. That keeps
 *  /a/b meaningful whether b is a document or a directory, without encoding the
 *  distinction into the URL.
 */
export default function Section({ id }: { id: Key }) {
  const params = useParams()
  const location = useLocation()
  const meta = sections.find((s) => s.id === id)!
  const { content, ready, error } = useContent()
  const items = content[id] as any[]

  // react-router gives the wildcard tail in `*`; older single-segment routes
  // still pass docId, so both are accepted.
  const rest = (params['*'] ?? params.docId ?? '').replace(/^\/+|\/+$/g, '')

  // Nothing can be resolved until the read settles. Before it does, `items` is
  // empty - and an empty list used to fall through to the redirect below, so
  // reloading a document URL bounced the reader to the section root every time.
  if (!ready) return <Skeleton rows={rest ? 1 : 4} />

  if (!rest) return <Browse id={id} meta={meta} items={items} at="" />

  const doc = items.find((i) => (i.path ?? i.id) === rest)
  if (doc) return <Detail item={doc} section={id} meta={meta} content={content} />

  const inFolder = items.filter((i) => (i.path ?? '').startsWith(rest + '/'))
  if (inFolder.length) return <Browse id={id} meta={meta} items={items} at={rest} />

  // A failed read is not a missing document. The shell already says the read
  // failed; redirecting as well would throw away the URL the reader came with.
  if (error) return null

  return <Navigate to={meta.path} replace state={{ from: location.pathname }} />
}

// ---------------------------------------------------------------------------

/** A folder view: the sub-folders directly beneath, then the documents in it. */
function Browse({ id, meta, items, at }: { id: Key; meta: any; items: any[]; at: string }) {
  const { query, tag } = useAppSelector((s) => s.ui)

  const scope = at ? items.filter((i) => (i.path ?? '').startsWith(at + '/')) : items
  const shown = scope.filter((i) =>
    matches(
      query,
      tag,
      [i.title, i.description ?? '', i.body ?? '', ...(i.tags ?? [])],
      i.tags ?? [],
    ),
  )

  // At the section root, where the content has folders, show the whole tree
  // rather than one level of them. Finding a command should not take three
  // navigations through pages that each show a single row.
  const hasFolders = shown.some((i) => (i.segments?.length ?? 1) > 1)
  const asTree = !at && hasFolders

  const depth = at ? at.split('/').length : 0
  const folders = new Map<string, number>()
  const here: any[] = []
  for (const i of shown) {
    const segs: string[] = i.segments ?? [i.id]
    if (segs.length > depth + 1) {
      const name = segs[depth]
      folders.set(name, (folders.get(name) ?? 0) + 1)
    } else {
      here.push(i)
    }
  }

  return (
    <div className="page" data-section={id}>
      {/* Inside a folder the folder is the page, so it names the tab. */}
      <Title>{at ? at.split('/').pop() : meta.label}</Title>
      <Crumbs meta={meta} at={at} />
      <h1 className="pagetitle">{at ? at.split('/').pop() : meta.label}</h1>
      <p className="standfirst">{at ? `${shown.length} in ${at}` : meta.blurb}</p>

      {shown.length === 0 ? (
        <Empty query={query} tag={tag} />
      ) : asTree ? (
        <Tree items={shown} basePath={meta.path} searching={Boolean(query.trim())} />
      ) : (
        <>
          {folders.size > 0 && (
            <ul className="folders">
              {[...folders.entries()].sort().map(([name, n]) => (
                <li key={name}>
                  <Link to={`${meta.path}/${at ? at + '/' : ''}${name}`}>
                    <span className="fname">{name}</span>
                    <span className="fcount">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {here.length > 0 && (
            <ul className="cards">
              {here.map((i) => (
                <li key={i.path ?? i.id}>
                  <Link to={`${meta.path}/${i.path ?? i.id}`}>
                    <span className="head">
                      <span className="t">{i.title}</span>
                      {i.status && <span className="status">{i.status}</span>}
                    </span>
                    {(i.description || firstLine(i.body)) && (
                      <span className="d">{i.description || firstLine(i.body)}</span>
                    )}
                    <span className="foot">
                      {i.date && <time dateTime={i.date}>{formatDate(i.date)}</time>}
                      <span className="mins">{readingTime(i)}</span>
                      {(i.tags ?? []).slice(0, 3).map((t: string) => (
                        <span key={t} className="ftag">
                          #{t}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Detail({
  item,
  section,
  meta,
  content,
}: {
  item: Doc
  section: Key
  meta: any
  content: Sections
}) {
  const dispatch = useAppDispatch()
  const { tag } = useAppSelector((s) => s.ui)
  const toc = (item.headings ?? []).filter((h) => h.depth === 2)

  return (
    <article className="page reading" data-section={section}>
      <Title>{item.title}</Title>
      <Crumbs meta={meta} at={item.parent ?? ''} />

      <h1 className="pagetitle">{item.title}</h1>
      {item.description && <p className="standfirst">{item.description}</p>}

      <div className="meta">
        {item.date && <time dateTime={item.date}>{formatDate(item.date)}</time>}
        {item.status && <span className="status">{item.status}</span>}
        <span className="mins">{readingTime(item)}</span>
      </div>

      {toc.length > 2 && (
        <nav className="toc" aria-label="On this page">
          {toc.map((h: any) => (
            <a key={h.text} href={`#${slugify(h.text)}`}>
              {h.text}
            </a>
          ))}
        </nav>
      )}

      {item.body && <Markdown source={item.body} />}

      <Connections item={item} content={content} />

      <TagRow tags={item.tags ?? []} active={tag} onPick={(t) => dispatch(toggleTag(t))} />
    </article>
  )
}

/**
 * What this document points at, and what points at it.
 *
 * External links come with the sentence they were written in, which is the
 * whole reason they are extracted rather than listed: "ClickUp 868kavmc1" says
 * nothing, "this ticket blocks the staging merge" says why to open it.
 * Backlinks are computed by the publisher, so a topic lists its plans and
 * ideas without anyone maintaining that list.
 */
function Connections({ item, content }: { item: Doc; content: Sections }) {
  const doc = (ref: string) => {
    const r = resolveRef(ref)
    if (!r) return undefined
    const found = content[r.kind.id].find((d) => d.id === r.id)
    // A reference to a draft is not an error - it is simply not public yet.
    return found ? { kind: r.kind, doc: found } : undefined
  }
  const related = item.refs.map(doc).filter(Boolean) as { kind: any; doc: Doc }[]
  const backlinks = item.backlinks.map(doc).filter(Boolean) as { kind: any; doc: Doc }[]
  if (!item.links.length && !related.length && !backlinks.length) return null

  return (
    <aside className="connections" aria-label="Links">
      {item.links.length > 0 && (
        <section>
          <h2>Links</h2>
          <ul>
            {item.links.map((l) => (
              <li key={l.url}>
                <span className="src" data-source={l.source}>
                  {l.source}
                </span>
                <a href={l.url} target="_blank" rel="noreferrer noopener">
                  {l.label || l.external_id || l.url}
                </a>
                {l.sentence && <p>{l.sentence}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {[
        ['Related', related],
        ['Referenced by', backlinks],
      ].map(([title, list]) =>
        (list as { kind: any; doc: Doc }[]).length ? (
          <section key={title as string}>
            <h2>{title as string}</h2>
            <ul>
              {(list as { kind: any; doc: Doc }[]).map(({ kind, doc: d }) => (
                <li key={`${kind.id}/${d.id}`}>
                  <span className="src">{kind.label}</span>
                  <Link to={`${kind.path}/${d.path}`}>{d.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </aside>
  )
}

/** Section › folder › folder — every segment is a real destination. */
function Crumbs({ meta, at }: { meta: any; at: string }) {
  const parts = at ? at.split('/') : []
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to={meta.path}>{meta.label}</Link>
      {parts.map((p, n) => (
        <span key={p}>
          <span className="sep" aria-hidden>
            ›
          </span>
          <Link to={`${meta.path}/${parts.slice(0, n + 1).join('/')}`}>{p}</Link>
        </span>
      ))}
    </nav>
  )
}

// ---------------------------------------------------------------------------

function firstLine(body?: string): string {
  if (!body) return ''
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line || /^[#!|>*-]|^```/.test(line)) continue
    return line.replace(/[*_`]/g, '').slice(0, 160)
  }
  return ''
}

function readingTime(item: any): string {
  return `${readingMinutes(item.body ?? item.summary)} min`
}
