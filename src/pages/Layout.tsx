import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import Mark from '../components/Mark'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { SECTION_KEY, sections } from '../lib/sections'
import { useAppDispatch, useAppSelector } from '../store'
import { useContent } from '../lib/useContent'
import { setNavOpen, setQuery } from '../store/uiSlice'

/** The public shell.
 *
 *  One vertical sidebar: wordmark, sections, then the dashboard, kept below a
 *  rule because it leaves the public site for an authenticated one and should
 *  not read as a sixth section.
 *
 *  The active marker is a single shared element that slides between entries
 *  rather than one marker per link fading in. That is the one thing worth
 *  spending motion on here - it shows which section you came from, which a
 *  static highlight cannot.
 */
export default function PublicLayout() {
  const dispatch = useAppDispatch()
  const { query, navOpen } = useAppSelector((s) => s.ui)
  const { content } = useContent()
  const location = useLocation()
  const still = useReducedMotion()

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

        <nav aria-label="Sections">
          {/* A section with nothing in it is a link to an empty page. Hide it
              until it has content, so the nav describes what is actually here. */}
          {sections
            .filter((s) => s.id === 'home' || content[SECTION_KEY[s.id]].length > 0)
            .map((s) => (
            <NavLink
              key={s.id}
              to={s.path}
              end={s.path === '/'}
              className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
              data-section={s.id}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      className="navmark"
                      layoutId="navmark"
                      transition={still ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
                    />
                  )}
                  <span className="label">{s.label}</span>
                  {s.id !== 'home' && (
                    <span className="n">{content[SECTION_KEY[s.id]].length}</span>
                  )}
                </>
              )}
              </NavLink>
            ))}

          {/* Not a content section - it reads the activity archive rather than
              markdown - but it belongs beside them in the nav, because to a
              reader it is simply another thing the site has. */}
          <NavLink
            to="/catchup"
            className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
            data-section="catchup"
          >
            <span className="label">Daily Catchup</span>
          </NavLink>
        </nav>

        <div className="navfoot">
          <a className="navitem dash" href="/admin" data-section="dashboard">
            <span className="label">Dashboard</span>
            <span className="lock" aria-hidden>sign in</span>
          </a>

          <label className="find">
            <span className="sr">Search</span>
            <input
              type="search"
              value={query}
              placeholder="Search"
              onChange={(e) => dispatch(setQuery(e.target.value))}
            />
          </label>

          <a
            className="src"
            href="https://github.com/ThanuMahee12/AgentContext"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source
          </a>
        </div>
      </aside>

      <button className="scrim" onClick={() => dispatch(setNavOpen(false))} tabIndex={-1} aria-hidden />

      <main className="sheet">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: still ? 0 : 0.22, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
