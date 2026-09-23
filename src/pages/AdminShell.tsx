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
  /** A panel beside the main column, not inside it. */
  panel?: ReactNode
  children: ReactNode
}) {
  return (
    /* tw-scope carries the preflight subset these utilities assume - this
       project does not import preflight globally. See styles/tailwind-plus.css. */
    <div className="tw-scope admin grid min-h-dvh grid-rows-[auto_auto_minmax(0,1fr)] content-start bg-ground">
      <header className="flex h-14 items-center gap-[18px] border-b border-line bg-navy px-6">
        {/* .wordmark and .glyph stay as CSS: the glyph is a four-layer
            gradient, and both are shared with the public shell. */}
        <Link to="/" className="wordmark !m-0">
          <span className="glyph" aria-hidden />
          AgentContext
        </Link>

        <nav aria-label="Signed in" className="flex gap-1">
          {PRIVATE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'rounded-s px-[11px] py-1.5 text-[13px] font-medium no-underline hover:bg-raised hover:text-text ' +
                (isActive ? 'bg-raised text-text' : 'text-text-2')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Pushed to the far end; the rule is what separates leaving the app
            from moving around inside it. */}
        <div className="ml-auto flex items-center gap-[14px] border-l border-line pl-4">
          {/* A dashboard with no way back to the site it belongs to is a dead end. */}
          <Link className="text-[13px] font-medium text-text-2 no-underline hover:text-hue" to="/catchup">
            Daily Catchup
          </Link>
          <Link className="text-[13px] font-medium text-text-2 no-underline hover:text-hue" to="/">
            Public site
          </Link>
          {user && (
            <button
              className="cursor-pointer rounded-s border border-line px-2.5 py-1.5 text-[12.5px] text-text-2 hover:border-field-line hover:text-text"
              onClick={() => signOut(auth)}
              title={user.email ?? undefined}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {toolbar && (
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5 border-b border-line px-6 py-3">
          {toolbar}
        </div>
      )}

      {/* The detail panel is a flex sibling of the main column, never a child:
          .detail is flex: 0 0 min(52%, 720px) against this row. */}
      <div className="flex min-h-0 min-w-0">
        <main className="min-w-0 grow overflow-auto px-6 pb-[72px] pt-[22px]">{children}</main>
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
