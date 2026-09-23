import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

import Title from '../components/Title'
import { Loading, Nothing } from '../components/State'
import { banner } from '../lib/ui'
import type { DayBar } from '../components/CatchupScene'

/** three.js is bigger than the rest of this app combined, so it is fetched only
 *  when someone actually switches to the 3D view - never on first paint, and
 *  never at all for a reader who stays on the calendar. Vite gives the dynamic
 *  import its own chunk automatically. */
const CatchupScene = lazy(() => import('../components/CatchupScene'))
import { auth } from '../firebase'
import { FirestoreSource } from '../lib/firestore'
import { formatMonth, formatTime, parseDayKey, toDayKey } from '../lib/format'
import { useArchive, useDailyTotals } from '../lib/queries'
import { failedCount } from '../lib/sessions'
import { getSource, groupByDay } from '../lib/source'
import type { Day, Session } from '../types'

const source = getSource()

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
  const [picked, setPicked] = useState<Date | null>(null)
  const [view, setView] = useState<'calendar' | '3d'>('calendar')

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setAuthReady(true)
      }),
    [],
  )

  // Public half - everyone gets this, signed in or not.
  const totalsQuery = useDailyTotals()

  // Private half. `enabled` is what keeps a signed-out visitor from firing a
  // request the rules are guaranteed to refuse - the query simply never runs,
  // rather than running and failing quietly in everyone's console. Admin reads
  // the same archive, so whichever screen is opened second pays nothing.
  const archive = useArchive({ enabled: authReady && !!user })

  const totals = totalsQuery.data ?? {}
  const days = useMemo(
    () => (archive.data ? groupByDay(archive.data.sessions, archive.data.context) : []),
    [archive.data],
  )
  const loading = totalsQuery.isLoading
  const note = totalsQuery.error ? String((totalsQuery.error as Error).message) : ''

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  // Land on the most recent day with activity rather than today, which is
  // usually empty first thing.
  useEffect(() => {
    if (picked) return
    const latest = Object.keys(totals).sort().reverse()[0]
    if (latest) setPicked(parseDayKey(latest))
  }, [totals, picked])

  const busiest = useMemo(
    () => Math.max(1, ...Object.values(totals).map((t) => t.sessions)),
    [totals],
  )

  /** Every recorded day, oldest first - the 3D field shows the whole archive at
   *  once rather than one month, which is the thing the calendar cannot do. */
  const series = useMemo<DayBar[]>(
    () =>
      Object.values(totals)
        .map((t) => ({ date: t.date, sessions: t.sessions, commands: t.commands }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [totals],
  )

  const selected = picked ? toDayKey(picked) : ''
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
      label: formatMonth(picked),
      days: rows.length,
      sessions: rows.reduce((n, t) => n + t.sessions, 0),
      commands: rows.reduce((n, t) => n + t.commands, 0),
      busiest: rows.reduce((a, b) => (b.sessions > a.sessions ? b : a)),
    }
  }, [picked, totals])

  if (loading) return <Loading page />

  const dayCount = Object.keys(totals).length

  return (
    // data-section sets --hue, the way every other section of the site does.
    <div data-section="catchup">
      <Title>Daily Catchup</Title>
      <header className="catchup-head">
        <h1>Daily Catchup</h1>
        <p>
          {dayCount} day{dayCount === 1 ? '' : 's'} of recorded activity
          {user ? `, signed in as ${user.email}` : '. Sign in to open a day.'}
        </p>
      </header>

      {note && <p className={`${banner} failure`}>{note}</p>}

      <div className="cal-views" role="group" aria-label="View">
        {(['calendar', '3d'] as const).map((v) => (
          <button
            key={v}
            className={'tag' + (view === v ? ' on' : '')}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v === 'calendar' ? 'Calendar' : '3D activity'}
          </button>
        ))}
      </div>

      {view === '3d' && (
        <Suspense fallback={<Loading>Loading the 3D view…</Loading>}>
          <CatchupScene
            data={series}
            selected={selected}
            onPick={(iso) => setPicked(parseDayKey(iso))}
          />
        </Suspense>
      )}

      <div className={'catchup-grid' + (view === '3d' ? ' solo' : '')}>
        <div className="cal" hidden={view === '3d'}>
          <Calendar
            onChange={(v) => setPicked(v as Date)}
            value={picked}
            maxDate={new Date()}
            tileClassName={({ date, view }) => {
              if (view !== 'month') return null
              const t = totals[toDayKey(date)]
              if (!t?.sessions) return null
              // Four steps rather than a continuous ramp: a reader compares days
              // at a glance, they do not read a value off a scale.
              return `work-${Math.min(4, Math.ceil((t.sessions / busiest) * 4))}`
            }}
          />
          <p className="cal-key">
            <span>quiet</span>
            {[1, 2, 3, 4].map((n) => (
              <i
                key={n}
                style={{
                  background: `color-mix(in srgb, var(--hue) ${[14, 28, 44, 62][n - 1]}%, transparent)`,
                }}
              />
            ))}
            <span>busy</span>
          </p>
        </div>

        <section className="catchup-day">
          {!selected && <Nothing>Pick a day.</Nothing>}

          {selected && (
            <>
              <h2>{selected}</h2>
              {dayTotals ? (
                <ul className="totals">
                  <li>
                    <b>{dayTotals.sessions}</b>
                    <span>conversations</span>
                  </li>
                  <li>
                    <b>{dayTotals.messages}</b>
                    <span>messages</span>
                  </li>
                  <li>
                    <b>{dayTotals.commands}</b>
                    <span>commands</span>
                  </li>
                  <li>
                    <b>{dayTotals.files}</b>
                    <span>files</span>
                  </li>
                  {dayTotals.failed > 0 && (
                    <li className="bad">
                      <b>{dayTotals.failed}</b>
                      <span>failed</span>
                    </li>
                  )}
                </ul>
              ) : (
                <Nothing>Nothing recorded on this day.</Nothing>
              )}

              {!user && dayTotals && (
                <p className="signin-hint">
                  <a href="/admin">Sign in</a> to read the conversations from this day.
                </p>
              )}

              {user && dayDetail && <DayHistory day={dayDetail} />}
              {user && !dayDetail && dayTotals && (
                <Nothing>No conversation detail for this day.</Nothing>
              )}

              {month && (
                <section className="monthsum">
                  <h3>{month.label}</h3>
                  <p>
                    Active on <b>{month.days}</b> day{month.days === 1 ? '' : 's'},{' '}
                    <b>{month.sessions}</b> conversation{month.sessions === 1 ? '' : 's'},{' '}
                    <b>{month.commands}</b> command{month.commands === 1 ? '' : 's'}. Busiest was{' '}
                    <button
                      className="linkish"
                      onClick={() => {
                        const [y, m, d] = month.busiest.date.split('-').map(Number)
                        setPicked(new Date(y, m - 1, d))
                      }}
                    >
                      {month.busiest.date}
                    </button>{' '}
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
    <div style={{ marginTop: 20 }}>
      <h3>Conversations</h3>
      <div className="cards">
        {day.sessions.map((s) => (
          <Conversation key={s.session_id} session={s} />
        ))}
      </div>

      {day.context.length > 0 && (
        <>
          <h3>Links</h3>
          <ul className="doclist">
            {day.context.map((c) => (
              <li key={c.doc_id}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  <strong>{c.title || c.url}</strong>
                  {c.source && <span className="project">{c.source}</span>}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * One recorded conversation, built to the shape `.card` actually expects: a
 * two-column grid of stripe and inner. An earlier version put a button inside
 * it, which the 3px column squeezed into a sliver - the classes were right and
 * the structure was not.
 *
 * Commands live in a subcollection and are fetched only when a card is opened;
 * one session in this archive carries 294 of them.
 */
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
    } catch {
      /* metadata is still worth showing */
    } finally {
      setBusy(false)
    }
  }

  const failed = failedCount(session)

  return (
    <div className="convo">
      <button className="card" onClick={toggle} aria-expanded={open}>
        <span
          className="stripe"
          data-provider={session.provider}
          data-state={failed > 0 ? 'failed' : undefined}
        />
        <span className="inner">
          <span className="row1">
            <time dateTime={session.started}>{formatTime(session.started)}</time>
            <span className="project">{session.project}</span>
            <span className="who">
              {session.provider}
              {session.os_user ? ` · ${session.os_user}` : ''}
              {session.git_branch && session.git_branch !== 'HEAD'
                ? ` · ${session.git_branch}`
                : ''}
            </span>
          </span>

          {session.preview && <span className="preview">{session.preview}</span>}

          <span className="stats">
            <span className="stat">
              <b>{session.message_count}</b> msg
            </span>
            <span className="stat">
              <b>{session.command_count}</b> cmd
            </span>
            {failed > 0 && (
              <span className="stat err">
                <b>{failed}</b> failed
              </span>
            )}
            <span className="stat">
              <b>{session.file_count}</b> files
            </span>
            <span className="stat">{open ? 'hide commands' : 'show commands'}</span>
          </span>
        </span>
      </button>

      {open && (
        <div className="convo-detail">
          {busy && <Loading>Fetching commands…</Loading>}
          {!busy && !full.commands?.length && <Nothing>No commands recorded.</Nothing>}
          {!!full.commands?.length && (
            <ol className="cmdlist">
              {full.commands.map((c, i) => (
                <li key={c.tool_id || i} data-failed={c.exit_status === 1 || undefined}>
                  <code>{c.command}</code>
                  {c.description && <span>{c.description}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
