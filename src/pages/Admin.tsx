import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from 'firebase/auth'

import AdminShell from './AdminShell'
import Facet from '../components/Facet'
import LinkRow from '../components/LinkRow'
import SessionDetail from '../components/SessionDetail'
import SessionTable, { toRows } from '../components/SessionTable'
import Title from '../components/Title'
import { FIRESTORE_HINT, Failure, Loading, Nothing } from '../components/State'
import { FirestoreSource } from '../lib/firestore'
import { useArchive } from '../lib/queries'
import { countBy, mergeContext, subagentCounts } from '../lib/sessions'
import { applyFilters, facets, getSource, groupByDay } from '../lib/source'
import type { Session } from '../types'

const source = getSource()

export default function Admin({ user }: { user: User | null }) {
  // One shared read: Catchup asks for the same archive and gets this cache.
  const { data, isPending } = useArchive()
  const sessions = data?.sessions ?? []
  const context = data?.context ?? []
  const problems = data?.problems ?? []

  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<string[]>([])
  const [projects, setProjects] = useState<string[]>([])
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

  // "/" focuses search - this is a keyboard-first tool, not a form
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

  const f = useMemo(() => facets(sessions.filter((s) => !s.is_sidechain)), [sessions])
  const agentCounts = useMemo(() => subagentCounts(sessions), [sessions])

  const days = useMemo(
    () => applyFilters(groupByDay(sessions, context), { projects, users, providers, query }),
    [sessions, context, projects, users, providers, query],
  )

  const shown = days.reduce((n, d) => n + d.sessions.length, 0)

  /** The table is flat, so the per-day link rows have nowhere to hang. Rather
   *  than drop them, the links for every day still in the filter are merged and
   *  shown once. */
  const links = useMemo(() => mergeContext(days), [days])

  const rows = useMemo(
    () => toRows(days.flatMap((d) => d.sessions), agentCounts),
    [days, agentCounts],
  )

  return (
    <AdminShell
      user={user}
      panel={selected && <SessionDetail session={selected} onClose={() => setSelected(null)} />}
      toolbar={
        <>
          <label className="shrink basis-[300px]">
            <span className="sr">Search</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands, files…"
              aria-label="Search sessions"
              className="h-8 w-full rounded-s border border-field-line bg-surface px-2.5 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-hue"
            />
          </label>

          <nav aria-label="Filters" className="facets">
            <Facet title="Project" options={f.projects} selected={projects} onChange={setProjects}
              counts={countBy(sessions, (s) => s.project)} />
            <Facet title="Provider" options={f.providers} selected={providers} onChange={setProviders}
              counts={countBy(sessions, (s) => s.provider)} />
            <Facet title="User" options={f.users} selected={users} onChange={setUsers}
              counts={countBy(sessions, (s) => s.os_user)} />
          </nav>
        </>
      }
    >
      <Title>Session archive</Title>

      {source.name === 'not-connected' && (
          <div className="banner">
            No data source configured. Firestore is not wired up yet, so this dashboard is empty.
          </div>
        )}

        {isPending ? (
          <Loading />
        ) : problems.length ? (
          <Failure detail={problems.join(' · ')} hint={FIRESTORE_HINT} />
        ) : days.length === 0 ? (
          <Nothing>{query ? `Nothing matches “${query}”.` : 'No sessions captured yet.'}</Nothing>
        ) : (
          <>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 0 }}>
              {shown} session{shown === 1 ? '' : 's'} across {days.length} day
              {days.length === 1 ? '' : 's'}
              {' · click a column to sort, a row to open it'}
            </p>

            <SessionTable rows={rows} selectedId={selected?.session_id} onOpen={openSession} />

            {links.length > 0 && (
              <section style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>
                  Links in view
                </h2>
                <LinkRow items={links} />
              </section>
            )}
          </>
        )}
    </AdminShell>
  )
}
