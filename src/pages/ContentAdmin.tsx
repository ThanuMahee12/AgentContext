import { Link } from 'react-router-dom'

import Title from '../components/Title'
import { Chip, Failure, Loading, Nothing } from '../components/State'
import { DRAFT, PUBLISHED, describeError, useDocs, useSetVisibility } from '../lib/queries'

/**
 * Promote a document to the public page, or pull it back.
 *
 * Visibility is the only thing this page writes. It is deliberately not the
 * same field as `status` — authors use that for workflow (open, implementing,
 * done), and a page that published whatever the author last typed there would
 * turn a rename into a disclosure.
 *
 * Reading every document, drafts included, requires being signed in: the rule
 * on /docs allows an unpublished document only to `canView()`.
 */
export default function ContentAdmin() {
  const { data: docs = [], isPending, error } = useDocs()
  const setVisibility = useSetVisibility()

  const promote = (row: { id: string; title: string }, next: string) => {
    if (next === PUBLISHED &&
        !confirm(`Publish "${row.title}" to the public page?\n\nAnyone on the internet will be able to read it.`)) return
    setVisibility.mutate({ id: row.id, visibility: next })
  }

  const live = docs.filter((d) => d.visibility === PUBLISHED).length
  /** The row currently being written, read straight off the mutation rather
   *  than tracked in a second piece of state beside it. */
  const saving = setVisibility.isPending ? setVisibility.variables?.id : undefined

  if (isPending) return <Loading page>Loading documents…</Loading>

  return (
    <div className="admin">
      <Title>Content</Title>
      <header className="dayhead" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Content</h1>
          <p className="lede" style={{ margin: '4px 0 0' }}>
            {docs.length} document{docs.length === 1 ? '' : 's'} · <strong>{live} public</strong>
            {' · '}<Link to="/catchup">Daily Catchup</Link>
            {' · '}<Link to="/admin">Dashboard</Link>
          </p>
        </div>
      </header>

      {error && <Failure title="Could not load documents." detail={describeError(error)} />}
      {setVisibility.error && (
        <Failure title="Could not change visibility." detail={describeError(setVisibility.error)} />
      )}
      {docs.length === 0 && <Nothing>No documents published to Firestore yet.</Nothing>}

      <div className="cards">
        {docs.map((d) => {
          const isPublic = d.visibility === PUBLISHED
          return (
            <article className="card" key={d.id}>
              <div className="crumbs">
                <span className="crumb">{d.section}</span>
                {d.date && <Chip>{d.date}</Chip>}
                {d.agent && <Chip>{d.agent}</Chip>}
                {d.status && <Chip>status: {d.status}</Chip>}
              </div>

              <h3 style={{ margin: '6px 0 2px' }}>{d.title}</h3>
              {d.description && <p className="lede" style={{ marginTop: 0 }}>{d.description}</p>}

              <div className="facet" style={{ alignItems: 'center', gap: 10 }}>
                <span className={isPublic ? 'ok' : 'lede'}>
                  {isPublic ? '● public' : '○ draft — admin only'}
                </span>
                <button
                  className="iconbtn"
                  disabled={saving === d.id}
                  onClick={() => promote(d, isPublic ? DRAFT : PUBLISHED)}
                >
                  {saving === d.id ? 'saving…' : isPublic ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <p className="lede" style={{ marginTop: 22 }}>
        Publishing here writes <code>visibility</code> in Firestore and takes effect
        immediately — no deploy. Re-running <code>publish-docs</code> keeps this choice
        unless the markdown itself declares a <code>visibility</code>.
      </p>
    </div>
  )
}
