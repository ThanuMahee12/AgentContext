import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { signOut, type User } from 'firebase/auth'

import { auth } from '../firebase'
import { getSource } from '../lib/source'

const source = getSource()

/** The signed-in shell.
 *
 * Admin built this chrome itself and ContentAdmin had none at all, which left
 * three things wrong at once:
 *
 *   - `/content` was orphaned. Nothing in the app linked to it, so the screen
 *     that promotes a draft to the public internet was reachable only by typing
 *     the URL.
 *   - the sidebar existed twice, here and in Layout.tsx, and the two copies had
 *     already drifted.
 *   - sign-out lived on one screen, so leaving from `/content` meant navigating
 *     somewhere else first.
 *
 * Composed by props rather than mounted as a route layout: Admin's search and
 * facets belong IN the sidebar, and a page cannot render into its parent's
 * <aside> through an <Outlet> without a portal or a context dance. Passing the
 * extras down is the version with no indirection in it.
 */
export default function AdminShell({
  user,
  here,
  aside,
  panel,
  children,
}: {
  user: User | null
  /** What this screen is, shown under the wordmark. */
  here: string
  /** Screen-specific sidebar content - filters, facets, a search box. */
  aside?: ReactNode
  /** A panel beside the main column, not inside it. `.detail` is
   *  `flex: 0 0 min(52%, 720px)` against `.site`, so nesting it in `.sheet`
   *  would collapse it into the scrolling body instead of splitting the row. */
  panel?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="site admin">
      <aside className="sidenav">
        <Link to="/" className="wordmark">
          <span className="glyph" aria-hidden />
          AgentContext
        </Link>

        <p className="here">
          {here}
          <span className="src">{source.name}</span>
        </p>

        <nav aria-label="Signed in">
          {PRIVATE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
              data-section="dashboard"
            >
              <span className="label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {aside}

        <div className="navfoot">
          {/* A dashboard with no way back to the site it belongs to is a dead end. */}
          <Link className="navitem dash" to="/catchup">
            <span className="label">Daily Catchup</span>
          </Link>
          <Link className="navitem dash" to="/">
            <span className="label">Public site</span>
          </Link>
          {user && (
            <button className="ghost" onClick={() => signOut(auth)} title={user.email ?? undefined}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="sheet">{children}</main>

      {panel}
    </div>
  )
}

/** The signed-in screens. Both are private; neither appears in the public nav. */
const PRIVATE = [
  { to: '/admin', label: 'Session archive' },
  { to: '/content', label: 'Content' },
]
