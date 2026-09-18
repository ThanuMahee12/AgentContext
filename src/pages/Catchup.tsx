import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'

import { FirestoreSource } from '../data/firestore'
import { getSource, groupByDay } from '../data/source'
import type { ContextItem, Day, Session } from '../types'

const source = getSource()

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** YYYY-MM-DD in local time. `toISOString` would shift the date across the
 *  dateline for anyone west of UTC, filing a session under the wrong day. */
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Monday-first weekday index, because the calendar reads Mon..Sun. */
const weekday = (d: Date) => (d.getDay() + 6) % 7

/**
 * Daily Catchup — what happened, day by day.
 *
 * The archive is already filed by date; this is the view that admits it. A
 * month of squares shows at a glance which days had work on them, and a day
 * opens the conversations recorded against it.
 *
 * Sign-in required, and not merely by convention: `firestore.rules` denies
 * anonymous reads of every session, so an unauthenticated visitor gets nothing
 * from the database rather than a page that merely declines to render.
 */
export default function Catchup({ user }: { user: User | null }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [context, setContext] = useState<ContextItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(() => new Date())
  const [picked, setPicked] = useState('')

  useEffect(() => {
    // Settled rather than all: a failure in one query must not blank the other
    // and look identical to an empty archive.
    Promise.allSettled([source.sessions(), source.context()])
      .then(([s, c]) => {
        const problems: string[] = []
        if (s.status === 'fulfilled') setSessions(s.value)
        else problems.push(`sessions: ${String((s.reason as Error)?.message ?? s.reason)}`)
        if (c.status === 'fulfilled') setContext(c.value)
        else problems.push(`links: ${String((c.reason as Error)?.message ?? c.reason)}`)
        setError(problems.join(' · '))
      })
      .finally(() => setLoading(false))
  }, [])

  const days = useMemo(() => groupByDay(sessions, context), [sessions, context])
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  // Land on the most recent day that actually has something on it, rather than
  // on today — which is usually empty first thing in the morning.
  useEffect(() => {
    if (picked || !days.length) return
    setPicked(days[0].date)
    const [y, m] = days[0].date.split('-').map(Number)
    setCursor(new Date(y, m - 1, 1))
  }, [days, picked])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const total = new Date(year, month + 1, 0).getDate()
  const lead = weekday(first)

  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => key(new Date(year, month, i + 1))),
  ]

  const monthTotal = cells.reduce(
    (n, c) => n + (c ? (byDate.get(c)?.sessions.length ?? 0) : 0), 0)

  const day = picked ? byDate.get(picked) : undefined

  if (loading) return <p className="empty" style={{ paddingTop: 80 }}>Loading the archive…</p>

  return (
    <div className="admin">
      <header className="dayhead" style={{ marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Daily Catchup</h1>
          <p className="lede" style={{ margin: '4px 0 0' }}>
            {sessions.length} conversation{sessions.length === 1 ? '' : 's'} recorded
            across {days.length} day{days.length === 1 ? '' : 's'}
            {user?.email ? ` · ${user.email}` : ''}
          </p>
        </div>
      </header>

      {error && <p className="banner failure">{error}</p>}

      <div className="cal-nav">
        <button className="iconbtn" onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="Previous month">←</button>
        <strong>{MONTHS[month]} {year}</strong>
        <button className="iconbtn" onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="Next month">→</button>
        <span className="chip">{monthTotal} this month</span>
        <button className="iconbtn" onClick={() => setCursor(new Date())}>Today</button>
      </div>

      <div className="cal" role="grid" aria-label={`${MONTHS[month]} ${year}`}>
        {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="cal-day is-pad" />
          const d = byDate.get(date)
          const n = d?.sessions.length ?? 0
          return (
            <button
              key={date}
              className={`cal-day${n ? ' has-work' : ''}${picked === date ? ' is-picked' : ''}`}
              onClick={() => setPicked(date)}
              aria-label={`${date}, ${n} conversation${n === 1 ? '' : 's'}`}
            >
              <span className="cal-num">{Number(date.slice(8))}</span>
              {n > 0 && <span className="cal-count">{n}</span>}
            </button>
          )
        })}
      </div>

      {day ? <DayDetail day={day} /> : (
        <p className="empty">
          {picked ? `Nothing recorded on ${picked}.` : 'Pick a day.'}
        </p>
      )}
    </div>
  )
}

/** One day's conversations, newest first. */
function DayDetail({ day }: { day: Day }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ marginBottom: 2 }}>{day.date}</h2>
      <p className="lede" style={{ marginTop: 0 }}>
        {day.sessions.length} conversation{day.sessions.length === 1 ? '' : 's'}
        {day.context.length ? ` · ${day.context.length} link${day.context.length === 1 ? '' : 's'}` : ''}
      </p>

      {day.sessions.length === 0 && <p className="empty">No conversations recorded.</p>}

      <div className="cards">
        {day.sessions.map((s) => <Conversation key={s.session_id} session={s} />)}
      </div>

      {day.context.length > 0 && (
        <div className="links" style={{ marginTop: 18 }}>
          <h3>Links that day</h3>
          <ul>
            {day.context.map((c) => (
              <li key={c.doc_id}>
                <a href={c.url} target="_blank" rel="noreferrer">{c.title || c.url}</a>
                {c.source && <span className="chip">{c.source}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** A single recorded conversation. Commands live in a subcollection and are
 *  fetched only when opened — one real session carries 141 of them. */
function Conversation({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState<Session>(session)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next || full.commands?.length) return
    // Narrowed explicitly: `commands` is not on the DataSource interface, only
    // the Firestore implementation keeps them in a subcollection.
    if (!(source instanceof FirestoreSource)) return
    setBusy(true)
    try {
      const commands = await source.commands(session)
      setFull((cur) => ({ ...cur, commands }))
    } catch {
      /* metadata is still worth showing */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card">
      <button className="entry" onClick={toggle} aria-expanded={open}>
        <div className="crumbs">
          <span className="crumb">{session.project}</span>
          {session.git_branch && <span className="branch">{session.git_branch}</span>}
          <span className="chip">{session.provider}</span>
        </div>
        <p className="lede">{session.preview || '(no preview)'}</p>
        <div className="facet">
          <span>{session.message_count} msg</span>
          <span>{session.command_count} cmd</span>
          {session.failed_count > 0 && <span className="failure">{session.failed_count} failed</span>}
          <span>{(session.started || '').slice(11, 16)}</span>
        </div>
      </button>

      {open && (
        <div className="detail">
          {busy && <p className="empty">Fetching commands…</p>}
          {full.commands?.length ? (
            <ul className="doclist">
              {full.commands.map((c, i) => (
                <li key={c.tool_id || i}>
                  <code className="cmd">{c.command}</code>
                  {c.description && <span className="lede"> {c.description}</span>}
                  {c.exit_status === 1 && <span className="failure"> failed</span>}
                </li>
              ))}
            </ul>
          ) : (!busy && <p className="empty">No commands recorded.</p>)}
        </div>
      )}
    </article>
  )
}
