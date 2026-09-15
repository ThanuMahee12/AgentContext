import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { listPublished } from '../data/published'
import type { PublishedPage } from '../types'

/** The front door. No sign-in, and no access to the archive.
 *
 *  It lists only what has been explicitly published. An empty list is the
 *  correct and expected state - nothing is public until someone publishes it.
 */
export default function Public() {
  const [pages, setPages] = useState<PublishedPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listPublished()
      .then(setPages)
      .catch(() => setError('Could not load published pages.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          AgentContext
        </div>
        <div className="spacer" />
        <Link className="iconbtn" to="/admin" style={{ textDecoration: 'none', lineHeight: '30px' }}>
          Sign in
        </Link>
      </div>

      <main className="main">
        <div className="prose">
          <h1>Published</h1>
          <p className="lede">
            Notes and write-ups shared from AgentContext. Session history itself is private.
          </p>

          {loading ? (
            <p className="empty">Loading…</p>
          ) : error ? (
            <p className="empty">{error}</p>
          ) : pages.length === 0 ? (
            <p className="empty">Nothing has been published yet.</p>
          ) : (
            <div className="cards" style={{ marginTop: 20 }}>
              {pages.map((p) => (
                <Link className="pubcard" key={p.slug} to={`/s/${p.slug}`}>
                  <h2>{p.title}</h2>
                  {p.summary && <p>{p.summary}</p>}
                  <div className="pubmeta">
                    <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
                    {p.tags?.map((t) => (
                      <span className="chip" key={t}>{t}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
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
