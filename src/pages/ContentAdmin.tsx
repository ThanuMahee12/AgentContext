import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'

import { db } from '../firebase'

type Doc = {
  id: string
  title: string
  section: string
  date: string
  status: string
  visibility: string
  agent: string
  description: string
}

const PUBLISHED = 'published'
const DRAFT = 'draft'

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
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, 'docs'))
      const rows = snap.docs.map((d) => {
        const v = d.data() as Partial<Doc>
        return {
          id: d.id,
          title: v.title || d.id,
          section: v.section || '',
          date: v.date || '',
          status: v.status || '',
          // Absent means draft. The publisher and the security rule both treat
          // it that way; showing it as anything else here would mislead.
          visibility: v.visibility || DRAFT,
          agent: v.agent || '',
          description: v.description || '',
        }
      })
      rows.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title))
      setDocs(rows)
      setError('')
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const setVisibility = async (row: Doc, next: string) => {
    if (next === PUBLISHED &&
        !confirm(`Publish "${row.title}" to the public page?\n\nAnyone on the internet will be able to read it.`)) return
    setBusy(row.id)
    try {
      await updateDoc(doc(db, 'docs', row.id), { visibility: next })
      setDocs((cur) => cur.map((d) => (d.id === row.id ? { ...d, visibility: next } : d)))
      setError('')
    } catch (e) {
      setError(`${row.id}: ${String((e as Error)?.message ?? e)}`)
    } finally {
      setBusy('')
    }
  }

  const live = docs.filter((d) => d.visibility === PUBLISHED).length

  if (loading) return <p className="empty" style={{ paddingTop: 80 }}>Loading documents…</p>

  return (
    <div className="admin">
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

      {error && <p className="banner failure">{error}</p>}
      {docs.length === 0 && <p className="empty">No documents published to Firestore yet.</p>}

      <div className="cards">
        {docs.map((d) => {
          const isPublic = d.visibility === PUBLISHED
          return (
            <article className="card" key={d.id}>
              <div className="crumbs">
                <span className="crumb">{d.section}</span>
                {d.date && <span className="chip">{d.date}</span>}
                {d.agent && <span className="chip">{d.agent}</span>}
                {d.status && <span className="chip">status: {d.status}</span>}
              </div>

              <h3 style={{ margin: '6px 0 2px' }}>{d.title}</h3>
              {d.description && <p className="lede" style={{ marginTop: 0 }}>{d.description}</p>}

              <div className="facet" style={{ alignItems: 'center', gap: 10 }}>
                <span className={isPublic ? 'ok' : 'lede'}>
                  {isPublic ? '● public' : '○ draft — admin only'}
                </span>
                <button
                  className="iconbtn"
                  disabled={busy === d.id}
                  onClick={() => void setVisibility(d, isPublic ? DRAFT : PUBLISHED)}
                >
                  {busy === d.id ? 'saving…' : isPublic ? 'Unpublish' : 'Publish'}
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
