import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPublished } from '../data/published'
import type { PublishedPage } from '../types'

/** A single published page, readable by anyone with the link. */
export default function Published() {
  const { slug = '' } = useParams()
  const [page, setPage] = useState<PublishedPage | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    getPublished(slug)
      .then((p) => {
        setPage(p)
        setState(p ? 'ready' : 'missing')
      })
      .catch(() => setState('missing'))
  }, [slug])

  return (
    <div className="app">
      <div className="topbar">
        <Link className="brand" to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="dot" />
          AgentContext
        </Link>
      </div>

      <main className="main">
        <div className="prose">
          {state === 'loading' && <p className="empty">Loading…</p>}

          {state === 'missing' && (
            <>
              <h1>Not found</h1>
              <p className="lede">
                This page is not published, or the link is wrong. If you expected private
                session history, that lives behind <Link to="/admin">sign-in</Link>.
              </p>
            </>
          )}

          {state === 'ready' && page && (
            <article>
              <h1>{page.title}</h1>
              <div className="pubmeta" style={{ marginBottom: 22 }}>
                <time dateTime={page.published_at}>{formatDate(page.published_at)}</time>
                {page.tags?.map((t) => (
                  <span className="chip" key={t}>{t}</span>
                ))}
              </div>
              {/* Rendered as text, not HTML: published content is reviewed by a
                  human but still ends up in a browser, and dangerouslySetInnerHTML
                  on stored content is how a review step gets turned into an XSS. */}
              <div className="pubbody">{page.body}</div>
            </article>
          )}
        </div>
      </main>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso ?? ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
