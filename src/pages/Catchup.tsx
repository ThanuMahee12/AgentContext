import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

import { auth, db } from '../firebase'
import { FirestoreSource } from '../data/firestore'
import { getSource, groupByDay } from '../data/source'
import type { ContextItem, Day, Session } from '../types'

const source = getSource()

/** Public per-day totals. Counts only — the private collection holding what
 *  actually happened is denied to anonymous readers by firestore.rules. */
type Totals = {
  date: string
  sessions: number
  messages: number
  commands: number
  files: number
  failed: number
}

/** YYYY-MM-DD in local time. `toISOString` shifts the date across the dateline
 *  for anyone west of UTC and files a day under the wrong square. */
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Daily Catchup.
 *
 * Two tiers on one page, and the split is enforced by the database rather than
 * by what this component chooses to render:
 *
 *   signed out  counts per day, from the public `daily` collection
 *   signed in   the conversations themselves, from the private archive
 *
 * A signed-out visitor could read this component's source and learn nothing
 * they could act on — the queries behind the private half return 403.
 */
export default function Catchup() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [totals, setTotals] = useState<Record<string, Totals>>({})
  const [days, setDays] = useState<Day[]>([])
  const [picked, setPicked] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true) }), [])

  // Public half — always loaded, for everyone.
  useEffect(() => {
    getDocs(collection(db, 'daily'))
      .then((snap) => {
        const out: Record<string, Totals> = {}
        snap.docs.forEach((d) => {
          const v = d.data() as Partial<Totals>
          out[d.id] = {
            date: d.id,
            sessions: Number(v.sessions ?? 0),
            messages: Number(v.messages ?? 0),
            commands: Number(v.commands ?? 0),
            files: Number(v.files ?? 0),
            failed: Number(v.failed ?? 0),
          }
        })
        setTotals(out)
      })
      .catch((e) => setNote(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false))
  }, [])

  // Private half — only attempted when signed in. The rules would refuse it
  // anyway; not asking keeps a guaranteed 403 out of everyone's console.
  useEffect(() => {
    if (!authReady || !user) return
    Promise.allSettled([source.sessions(), source.context()]).then(([s, c]) => {
      const sessions = s.status === 'fulfilled' ? (s.value as Session[]) : []
      const context = c.status === 'fulfilled' ? (c.value as ContextItem[]) : []
      setDays(groupByDay(sessions, context))
    })
  }, [authReady, user])

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  // Land on the most recent day with activity rather than today, which is
  // usually empty first thing.
  useEffect(() => {
    if (picked) return
    const dates = Object.keys(totals).sort().reverse()
    if (dates.length) {
      const [y, m, d] = dates[0].split('-').map(Number)
      setPicked(new Date(y, m - 1, d))
    }
  }, [totals, picked])

  const busiest = useMemo(
    () => Math.max(1, ...Object.values(totals).map((t) => t.sessions)), [totals])

  const selected = picked ? key(picked) : ''
  const dayTotals = selected ? totals[selected] : undefined
  const dayDetail = selected ? byDate.get(selected) : undefined

  // Totals for the month on screen, so the page says something about the shape
  // of a period rather than only about one square in it.
  const month = useMemo(() => {
    if (!picked) return null
    const prefix = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}`
    const rows = Object.values(totals).filter((t) => t.date.startsWith(prefix))
    if (!rows.length) return null
    return {
      label: picked.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      days: rows.length,
      sessions: rows.reduce((n, t) => n + t.sessions, 0),
      commands: rows.reduce((n, t) => n + t.commands, 0),
      busiest: rows.reduce((a, b) => (b.sessions > a.sessions ? b : a)),
    }
  }, [picked, totals])

  if (loading) return <p className="empty" style={{ paddingTop: 80 }}>Loading…</p>

  const dayCount = Object.keys(totals).length

  return (
    // data-section sets --hue, the way every other section of the site does.
    <div data-section="catchup">
      <header className="catchup-head">
        <h1>Daily Catchup</h1>
        <p>
          {dayCount} day{dayCount === 1 ? '' : 's'} of recorded activity
          {user ? `, signed in as ${user.email}` : '. Sign in to open a day.'}
        </p>
      </header>

      {note && <p className="banner failure">{note}</p>}

      <div className="catchup-grid">
        <div className="cal">
        <Calendar
          onChange={(v) => setPicked(v as Date)}
          value={picked}
          maxDate={new Date()}
          tileClassName={({ date, view }) => {
            if (view !== 'month') return null
            const t = totals[key(date)]
            if (!t?.sessions) return null
            // Four steps rather than a continuous ramp: a reader compares days
            // at a glance, they do not read a value off a scale.
            return `work-${Math.min(4, Math.ceil((t.sessions / busiest) * 4))}`
          }}
        />
        <p className="cal-key">
          <span>quiet</span>
          {[1, 2, 3, 4].map((n) => (
            <i key={n} style={{ background: `color-mix(in srgb, var(--hue) ${[14, 28, 44, 62][n - 1]}%, transparent)` }} />
          ))}
          <span>busy</span>
        </p>
        </div>

        <section className="catchup-day">
          {!selected && <p className="empty">Pick a day.</p>}

          {selected && (
            <>
              <h2>{selected}</h2>
              {dayTotals ? (
                <ul className="totals">
                  <li><b>{dayTotals.sessions}</b><span>conversations</span></li>
                  <li><b>{dayTotals.messages}</b><span>messages</span></li>
                  <li><b>{dayTotals.commands}</b><span>commands</span></li>
                  <li><b>{dayTotals.files}</b><span>files</span></li>
                  {dayTotals.failed > 0 && (
                    <li className="bad"><b>{dayTotals.failed}</b><span>failed</span></li>
                  )}
                </ul>
              ) : <p className="empty">Nothing recorded on this day.</p>}

              {!user && dayTotals && (
                <p className="signin-hint">
                  <a href="/admin">Sign in</a> to read the conversations from this day.
                </p>
              )}

              {user && dayDetail && <DayHistory day={dayDetail} />}
              {user && !dayDetail && dayTotals && (
                <p className="empty">No conversation detail for this day.</p>
              )}

              {month && (
                <section className="monthsum">
                  <h3>{month.label}</h3>
                  <p>
                    Active on <b>{month.days}</b> day{month.days === 1 ? '' : 's'},
                    {' '}<b>{month.sessions}</b> conversation{month.sessions === 1 ? '' : 's'},
                    {' '}<b>{month.commands}</b> command{month.commands === 1 ? '' : 's'}.
                    {' '}Busiest was{' '}
                    <button className="linkish" onClick={() => {
                      const [y, m, d] = month.busiest.date.split('-').map(Number)
                      setPicked(new Date(y, m - 1, d))
                    }}>{month.busiest.date}</button>{' '}
                    with {month.busiest.sessions}.
                  </p>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** The signed-in half: what actually happened that day. */
function DayHistory({ day }: { day: Day }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3>Conversations</h3>
      <div className="cards">
        {day.sessions.map((s) => <Conversation key={s.session_id} session={s} />)}
      </div>

      {day.context.length > 0 && (
        <div className="links" style={{ marginTop: 16 }}>
          <h3>Links</h3>
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
    </div>
  )
}

function Conversation({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState<Session>(session)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next || full.commands?.length) return
    if (!(source instanceof FirestoreSource)) return
    setBusy(true)
    try {
      setFull({ ...full, commands: await source.commands(session) })
    } catch { /* metadata is still worth showing */ } finally { setBusy(false) }
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
