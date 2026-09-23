import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { signOut, type User } from 'firebase/auth'

import Shell from '../components/Shell'
import { auth } from '../firebase'
import { outlineButton } from '../lib/ui'

/**
 * The signed-in shell: `/admin` and `/content`.
 *
 * It is `Shell` with its slots filled, which is the point - the public half
 * and this one are now the same frame, so the drawer, the scrim, the Escape
 * handler and close-on-navigate are written once. Before this, `/admin` had a
 * top bar with no mobile handling at all: on a phone the nav simply was not
 * reachable.
 *
 * `aside` is what the filters became. They belong to the page rather than the
 * shell, because search and facets mean nothing on `/content`.
 */
export default function AdminShell({
  user,
  aside,
  panel,
  children,
}: {
  user: User | null
  /** Screen-specific controls - search, filters. */
  aside?: ReactNode
  /** A panel beside the main column, not inside it. */
  panel?: ReactNode
  children: ReactNode
}) {
  return (
    <Shell
      nav={
        <nav aria-label="Signed in">
          {PRIVATE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
            >
              <span className="label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      }
      aside={aside}
      foot={
        <>
          {/* A dashboard with no way back to the site it belongs to is a dead end. */}
          <Link className="navitem dash" to="/catchup">
            <span className="label">Daily Catchup</span>
          </Link>
          <Link className="navitem dash" to="/">
            <span className="label">Public site</span>
          </Link>
          {user && (
            <button
              className={outlineButton}
              onClick={() => signOut(auth)}
              title={user.email ?? undefined}
            >
              Sign out
            </button>
          )}
        </>
      }
      panel={panel}
    >
      {children}
    </Shell>
  )
}

/** The signed-in screens. Both are private; neither appears in the public nav. */
const PRIVATE = [
  { to: '/admin', label: 'Session archive' },
  { to: '/content', label: 'Content' },
]
