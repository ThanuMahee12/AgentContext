/** The data layer.
 *
 *  Two implementations behind one interface: local fixtures (real data exported
 *  by AgentProbe, used until Firestore credentials are wired) and Firestore.
 *  The UI imports only `getSource()` and never learns which is active, so
 *  swapping them is a one-line change here rather than a refactor.
 */

import type { ContextItem, Day, Filters, Session } from '../types'
import { FirestoreSource } from './firestore'
import fixtures from './fixtures.json'

export interface DataSource {
  readonly name: string
  sessions(): Promise<Session[]>
  context(): Promise<ContextItem[]>
}

// --------------------------------------------------------------------------

class FixtureSource implements DataSource {
  readonly name = 'fixtures'

  async sessions(): Promise<Session[]> {
    return (import.meta.env.DEV ? fixtures.sessions : []) as unknown as Session[]
  }

  async context(): Promise<ContextItem[]> {
    return (import.meta.env.DEV ? fixtures.context : []) as unknown as ContextItem[]
  }
}

/** Nothing to show, and honest about why. Used for production builds until a
 *  real Firestore source is configured. */
class EmptySource implements DataSource {
  readonly name = 'not-connected'
  async sessions(): Promise<Session[]> { return [] }
  async context(): Promise<ContextItem[]> { return [] }
}

// --------------------------------------------------------------------------

/** Pick the data source.
 *
 *  Production always uses Firestore. Development defaults to local fixtures so
 *  the UI can be worked on offline, and `VITE_DATA_SOURCE=firestore` overrides
 *  that to test against the real database.
 *
 *  Fixtures are a DEVELOPMENT convenience only: they contain real commands,
 *  file paths and conversation previews, and Firebase Hosting is public. The
 *  DEV guard in FixtureSource makes shipping them structurally impossible
 *  rather than a rule someone has to remember - a production bundle resolves
 *  to empty arrays even if fixtures.json exists at build time, which lets
 *  tree-shaking drop the import entirely.
 */
export function getSource(): DataSource {
  const requested = import.meta.env.VITE_DATA_SOURCE

  if (requested === 'fixtures') return new FixtureSource()
  if (requested === 'empty') return new EmptySource()
  if (requested === 'firestore' || !import.meta.env.DEV) return new FirestoreSource()

  return new FixtureSource()
}

// -- shaping ----------------------------------------------------------------

/** Group sessions and context items into the day timeline.
 *
 *  A session is filed under its start date. Sessions get resumed — one in the
 *  real data ran 22 Jun to 11 Aug — so once AgentProbe emits `active_days`,
 *  this should fan a session across every day it was actually active instead.
 */
export function groupByDay(sessions: Session[], context: ContextItem[]): Day[] {
  const days = new Map<string, Day>()

  const ensure = (date: string): Day => {
    let day = days.get(date)
    if (!day) {
      day = { date, sessions: [], context: [] }
      days.set(date, day)
    }
    return day
  }

  for (const s of sessions) if (s.date) ensure(s.date).sessions.push(s)
  for (const c of context) if (c.date) ensure(c.date).context.push(c)

  return [...days.values()]
    .map((day) => ({
      ...day,
      sessions: day.sessions.sort((a, b) => b.started.localeCompare(a.started)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Client-side filtering.
 *
 *  Firestore handles the coarse cut (date range, project) server-side; this
 *  refines what came back. At personal scale — thousands of rows, not millions
 *  — searching in the browser is instant and avoids paying for a search service.
 */
export function applyFilters(days: Day[], f: Filters): Day[] {
  const q = f.query.trim().toLowerCase()
  const terms = q ? q.split(/\s+/) : []

  const sessionMatches = (s: Session): boolean => {
    if (f.projects.length && !f.projects.includes(s.project)) return false
    if (f.users.length && !f.users.includes(s.os_user)) return false
    if (f.providers.length && !f.providers.includes(s.provider)) return false
    if (!terms.length) return true
    // Commands are searched too — "what was that firestore curl" is the single
    // most useful query this dashboard can answer.
    const hay = [
      s.preview, s.project, s.cwd, s.os_user, s.git_branch,
      ...s.commands.map((c) => c.command + ' ' + c.description),
      ...s.files.map((x) => x.path),
    ].join(' ').toLowerCase()
    return terms.every((t) => hay.includes(t))
  }

  const contextMatches = (c: ContextItem): boolean => {
    if (f.projects.length && !f.projects.includes(c.project)) return false
    if (!terms.length) return true
    const hay = [c.url, c.title, c.body, c.source, c.external_id, ...c.keywords, ...c.tags]
      .join(' ').toLowerCase()
    return terms.every((t) => hay.includes(t))
  }

  return days
    .map((d) => ({
      date: d.date,
      sessions: d.sessions.filter(sessionMatches),
      context: d.context.filter(contextMatches),
    }))
    .filter((d) => d.sessions.length || d.context.length)
}

export function facets(sessions: Session[]) {
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort()
  return {
    projects: uniq(sessions.map((s) => s.project)),
    users: uniq(sessions.map((s) => s.os_user)),
    providers: uniq(sessions.map((s) => s.provider)),
  }
}
