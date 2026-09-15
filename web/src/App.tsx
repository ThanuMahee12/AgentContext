import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import Login from './components/Login'
import SessionDetail from './components/SessionDetail'
import { auth } from './firebase'
import { FirestoreSource } from './data/firestore'
import { applyFilters, facets, getSource, groupByDay } from './data/source'
import type { ContextItem, Session } from './types'

const source = getSource()

/** Only the Firestore source needs a signed-in user; fixtures and the empty
 *  source are local and gating them would just obstruct development. */
const NEEDS_AUTH = source.name === 'firestore'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!NEEDS_AUTH)

  useEffect(() => {
    if (!NEEDS_AUTH) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [])

  if (!authReady) return <div className="empty" style={{ paddingTop: 80 }}>Checking sign-in…</div>
  if (NEEDS_AUTH && !user) return <Login />

  return <Dashboard user={user} />
}

function Dashboard({ user }: { user: User | null }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [context, setContext] = useState<ContextItem[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [selected, setSelected] = useState<Session | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  /** Open a session, fetching its commands if the source keeps them in a
   *  subcollection. The list query deliberately does not carry them - one real
   *  session has 141 commands and a 2.2 MB transcript. */
  const openSession = async (s: Session) => {
    setSelected(s)
    if (s.commands?.length || !(source instanceof FirestoreSource)) return
    try {
      const commands = await source.commands(s)
      setSelected((cur) => (cur?.session_id === s.session_id ? { ...cur, commands } : cur))
    } catch {
      /* detail panel still shows files and metadata */
    }
  }

  useEffect(() => {
    Promise.all([source.sessions(), source.context()])
      .then(([s, c]) => {
        setSessions(s)
        setContext(c)
      })
      .finally(() => setLoading(false))
  }, [])

  // "/" focuses search — this is a keyboard-first tool, not a form
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const f = useMemo(() => facets(sessions), [sessions])

  const days = useMemo(
    () => applyFilters(groupByDay(sessions, context), { projects, users, providers, query }),
    [sessions, context, projects, users, providers, query],
  )

  const shown = days.reduce((n, d) => n + d.sessions.length, 0)

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          AgentContext
          <small>{source.name}</small>
        </div>

        <div className="search">
          <span aria-hidden style={{ color: 'var(--text-3)' }}>⌕</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, commands, files, links…"
            aria-label="Search"
          />
          <kbd>/</kbd>
        </div>

        <div className="spacer" />
        {user && (
          <button className="iconbtn" onClick={() => signOut(auth)} title={user.email ?? undefined}>
            Sign out
          </button>
        )}
        <ThemeToggle />
      </div>

      {source.name === 'fixtures' && (
        <div className="banner">
          Local fixtures from AgentProbe — development only, never shipped to a build.
        </div>
      )}
      {source.name === 'not-connected' && (
        <div className="banner">
          No data source configured. Firestore is not wired up yet, so this dashboard is empty.
        </div>
      )}

      <div className="body">
        <nav className="rail" aria-label="Filters">
          <Facet title="Project" options={f.projects} selected={projects} onChange={setProjects}
            counts={countBy(sessions, (s) => s.project)} />
          <Facet title="Provider" options={f.providers} selected={providers} onChange={setProviders}
            counts={countBy(sessions, (s) => s.provider)} />
          <Facet title="User" options={f.users} selected={users} onChange={setUsers}
            counts={countBy(sessions, (s) => s.os_user)} />
        </nav>

        <main className="main">
          {loading ? (
            <p className="empty">Loading…</p>
          ) : days.length === 0 ? (
            <p className="empty">
              {query ? `Nothing matches “${query}”.` : 'No sessions captured yet.'}
            </p>
          ) : (
            <>
              {query && (
                <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 0 }}>
                  {shown} session{shown === 1 ? '' : 's'} across {days.length} day
                  {days.length === 1 ? '' : 's'}
                </p>
              )}
              {days.map((day) => (
                <section className="daygroup" key={day.date}>
                  <div className="dayhead">
                    <h2>{formatDay(day.date)}</h2>
                    <span className="meta">
                      {day.sessions.length} session{day.sessions.length === 1 ? '' : 's'}
                      {day.context.length > 0 && ` · ${day.context.length} link${day.context.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  <div className="cards">
                    {day.sessions.map((s) => (
                      <SessionCard
                        key={s.session_id}
                        session={s}
                        selected={selected?.session_id === s.session_id}
                        onOpen={() => openSession(s)}
                      />
                    ))}
                  </div>

                  {day.context.length > 0 && <LinkRow items={day.context} />}
                </section>
              ))}
            </>
          )}
        </main>

        {selected && <SessionDetail session={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SessionCard({
  session,
  selected,
  onOpen,
}: {
  session: Session
  selected: boolean
  onOpen: () => void
}) {
  const failed = session.failed_count ?? session.commands.filter((c) => c.exit_status === 1).length
  return (
    <button className="card" aria-selected={selected} onClick={onOpen}>
      <span className="stripe" data-provider={session.provider} />
      <span className="inner">
        <span className="row1">
          <time dateTime={session.started}>{formatTime(session.started)}</time>
          <span className="project">{session.project}</span>
          <span className="who">
            {session.os_user}
            {session.git_branch && session.git_branch !== 'HEAD' ? ` · ${session.git_branch}` : ''}
          </span>
        </span>

        {session.preview && <span className="preview">{session.preview}</span>}

        <span className="stats">
          <span className="stat"><b>{session.message_count}</b> msg</span>
          <span className="stat"><b>{session.command_count}</b> cmd</span>
          {failed > 0 && <span className="stat err"><b>{failed}</b> failed</span>}
          <span className="stat"><b>{session.file_count}</b> files</span>
          <span className="stat">{(session.transcript_bytes / 1024).toFixed(0)} KB</span>
        </span>
      </span>
    </button>
  )
}

function LinkRow({ items }: { items: ContextItem[] }) {
  return (
    <div className="links">
      {items.map((c) => (
        <a
          className={'chip' + (c.source !== 'web' ? ' accent' : '')}
          key={c.doc_id}
          href={c.url}
          target="_blank"
          rel="noreferrer noopener"
          title={c.url}
        >
          {c.source}
          {c.external_id && <span style={{ opacity: 0.75 }}>{truncate(c.external_id, 28)}</span>}
          {c.mention_count > 1 && <span style={{ opacity: 0.55 }}>×{c.mention_count}</span>}
        </a>
      ))}
    </div>
  )
}

function Facet({
  title,
  options,
  selected,
  onChange,
  counts,
}: {
  title: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  counts: Record<string, number>
}) {
  if (options.length === 0) return null
  return (
    <div className="facet">
      <h3>{title}</h3>
      {options.map((o) => (
        <label key={o}>
          <input
            type="checkbox"
            checked={selected.includes(o)}
            onChange={(e) =>
              onChange(e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))
            }
          />
          <span>{o}</span>
          <span className="count">{counts[o] ?? 0}</span>
        </label>
      ))}
    </div>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<string>(
    () => document.documentElement.getAttribute('data-theme') ?? 'system',
  )

  const set = (next: string) => {
    setTheme(next)
    if (next === 'system') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('ac-theme')
    } else {
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('ac-theme', next)
    }
  }

  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  return (
    <button className="iconbtn" onClick={() => set(next)} title={`Theme: ${theme}`}>
      {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
    </button>
  )
}

// ---------------------------------------------------------------------------

function countBy<T>(xs: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of xs) {
    const k = key(x)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function formatDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
