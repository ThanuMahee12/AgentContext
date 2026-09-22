import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { signOut, type User } from 'firebase/auth'

import { auth } from '../firebase'

/** The signed-in shell: a top bar, and the page under it.
 *
 * There was a 250px sidebar here. It cost a fifth of the width on every screen
 * to hold six links and three filter lists, on a page whose whole job is a
 * wide table - eleven columns that were being squeezed so a nav could stay
 * permanently visible. Nav that is read once per visit does not need a column;
 * it needs a row.
 *
 * No label for the current screen: the nav below already names both screens and
 * marks the active one, and the source badge said `firestore` on every visit
 * while the one case worth knowing about - no source configured - has its own
 * banner on the archive page.
 *
 * `toolbar` is what the sidebar's filters became: a row under the bar, owned by
 * the page, because search and facets belong to the archive and mean nothing on
 * /content.
 */
export default function AdminShell({
  user,
  toolbar,
  panel,
  children,
}: {
  user: User | null
  /** Screen-specific controls - search, filters - in a row under the bar. */
  toolbar?: ReactNode
  /** A panel beside the main column, not inside it. `.detail` is
   *  `flex: 0 0 min(52%, 720px)` against `.adminbody`, so nesting it in
   *  `.sheet` would collapse it into the scrolling body. */
  panel?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="site admin">
      <header className="adminbar">
        <Link to="/" className="wordmark">
          <span className="glyph" aria-hidden />
          AgentContext
        </Link>

        <nav aria-label="Signed in">
          {PRIVATE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adminbar-end">
          {/* A dashboard with no way back to the site it belongs to is a dead end. */}
          <Link className="navitem dash" to="/catchup">
            Daily Catchup
          </Link>
          <Link className="navitem dash" to="/">
            Public site
          </Link>
          {user && (
            <button className="ghost" onClick={() => signOut(auth)} title={user.email ?? undefined}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {toolbar && <div className="admintools">{toolbar}</div>}

      <div className="adminbody">
        <main className="sheet">{children}</main>
        {panel}
      </div>
    </div>
  )
}

/** The signed-in screens. Both are private; neither appears in the public nav. */
const PRIVATE = [
  { to: '/admin', label: 'Session archive' },
  { to: '/content', label: 'Content' },
]
