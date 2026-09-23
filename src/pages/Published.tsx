import { Link, useParams } from 'react-router-dom'

import Title from '../components/Title'
import { Chip, Loading } from '../components/State'
import { formatDate } from '../lib/format'
import { usePublishedPage } from '../lib/queries'

/** A single published page, readable by anyone with the link. */
export default function Published() {
  const { slug = '' } = useParams()
  const { data: page, isPending, isError } = usePublishedPage(slug)

  // A missing slug and a refused read are the same thing to a reader: there is
  // nothing here to see. Retries are off, so isError is a settled answer.
  const missing = isError || (!isPending && !page)

  return (
    <div className="app">
      {/* The only route people are handed as a bare link, so the tab it opens
          should say which document it is rather than just the site name. */}
      <Title>{page ? page.title : missing ? 'Not found' : undefined}</Title>
      <div className="topbar">
        <Link className="brand" to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="dot" />
          Agentix
        </Link>
      </div>

      <main className="main">
        <div className="prose">
          {isPending && <Loading />}

          {missing && (
            <>
              <h1>Not found</h1>
              <p className="lede">
                This page is not published, or the link is wrong. If you expected private
                session history, that lives behind <Link to="/admin">sign-in</Link>.
              </p>
            </>
          )}

          {page && (
            <article>
              <h1>{page.title}</h1>
              <div className="pubmeta" style={{ marginBottom: 22 }}>
                <time dateTime={page.published_at}>{formatDate(page.published_at)}</time>
                {page.tags?.map((t) => (
                  <Chip key={t}>{t}</Chip>
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
