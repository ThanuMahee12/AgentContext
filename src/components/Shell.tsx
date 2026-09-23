import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import Mark from './Mark'
import { useAppDispatch, useAppSelector } from '../store'
import { setNavOpen } from '../store/uiSlice'

/**
 * The frame both halves of the site sit in.
 *
 * The public shell and the signed-in one had drifted into different shapes -
 * a sidebar on one, a top bar on the other - and only the public one had a
 * mobile drawer. So `/admin` had no way to reach its nav on a phone at all.
 * One component means the drawer, the scrim, the Escape handler and the
 * close-on-navigate are written once and both halves get them.
 *
 * Slots rather than variants: what differs between the two is only *what* goes
 * in the sidebar, never how the sidebar behaves.
 */
export default function Shell({
  nav,
  aside,
  foot,
  panel,
  children,
}: {
  /** The primary navigation - sections, or the signed-in screens. */
  nav: ReactNode
  /** Anything under the nav: search, filters. */
  aside?: ReactNode
  /** Pinned to the bottom of the sidebar. */
  foot?: ReactNode
  /** A column beside `<main>`, never inside it: `.detail` is
   *  `flex: 0 0 min(52%, 720px)` against the row they share. */
  panel?: ReactNode
  children: ReactNode
}) {
  const dispatch = useAppDispatch()
  const { navOpen } = useAppSelector((s) => s.ui)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    dispatch(setNavOpen(false))
  }, [location.pathname, dispatch])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch(setNavOpen(false))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen, dispatch])

  return (
    <div className={'site' + (navOpen ? ' navopen' : '')}>
      {/* Below 900px the sidebar slides off and this is the only way back to
          it. It is a real <button> with aria-expanded, so it is reachable by
          keyboard and announced as a control rather than decoration. */}
      <button
        className="drawertoggle"
        onClick={() => dispatch(setNavOpen(!navOpen))}
        aria-expanded={navOpen}
        aria-controls="sidenav"
      >
        <span className="bars" aria-hidden />
        {navOpen ? 'Close' : 'Menu'}
      </button>

      <aside className="sidenav" id="sidenav">
        <Link to="/" className="wordmark">
          <Mark />
          Agentix
        </Link>

        {nav}
        {aside}

        {foot && <div className="navfoot">{foot}</div>}
      </aside>

      {/* Tab-skipped and aria-hidden: it is a click target for dismissing the
          drawer, and Escape already does that for the keyboard. */}
      <button
        className="scrim"
        onClick={() => dispatch(setNavOpen(false))}
        tabIndex={-1}
        aria-hidden
      />

      {panel ? (
        <div className="flex min-h-0 min-w-0">
          <main className="sheet tw-scope min-w-0 grow">{children}</main>
          {panel}
        </div>
      ) : (
        <main className="sheet tw-scope">{children}</main>
      )}
    </div>
  )
}
