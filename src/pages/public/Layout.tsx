import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { SECTION_KEY, sections } from '../../content'
import { useAppDispatch, useAppSelector } from '../../store'
import { hydrateContent } from '../../store/contentSlice'
import { setNavOpen, setQuery, setTheme, type Theme } from '../../store/uiSlice'

/** The public shell.
 *
 *  Navigation is one vertical sidebar holding everything: the wordmark, the
 *  sections, search and the theme control. On narrow screens it becomes a
 *  drawer rather than collapsing into a row, so the section list keeps the
 *  same shape and order wherever you are.
 */
export default function PublicLayout() {
  const dispatch = useAppDispatch()
  const { query, theme, navOpen } = useAppSelector((s) => s.ui)
  const content = useAppSelector((s) => s.content)

  // Published content arrives over the bundled copy. Once per mount - the
  // content does not change while someone is reading.
  useEffect(() => {
    dispatch(hydrateContent())
  }, [dispatch])
  const location = useLocation()

  // Reading position belongs to the page; the drawer should not survive a move.
  useEffect(() => {
    window.scrollTo(0, 0)
    dispatch(setNavOpen(false))
  }, [location.pathname, dispatch])

  // Escape closes the drawer - a full-screen overlay with no keyboard exit is a trap.
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch(setNavOpen(false))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen, dispatch])

  const cycle: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }

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
          AgentContext
        </Link>

        <nav aria-label="Sections">
          {sections.map((s) => (
            <NavLink
              key={s.id}
              to={s.path}
              end={s.path === '/'}
              className={({ isActive }) => 'navitem' + (isActive ? ' on' : '')}
              data-section={s.id}
            >
              <span className="mark" aria-hidden />
              <span className="label">{s.label}</span>
              {s.id !== 'home' && (
              <span className="n">{content[SECTION_KEY[s.id]].length}</span>
            )}
            </NavLink>
          ))}
        </nav>

        <div className="navfoot">
          <label className="find">
            <span className="sr">Search</span>
            <input
              type="search"
              value={query}
              placeholder="Search"
              onChange={(e) => dispatch(setQuery(e.target.value))}
            />
          </label>

          <div className="navmeta">
            <button
              className="ghost"
              onClick={() => dispatch(setTheme(cycle[theme]))}
              aria-label={`Theme: ${theme}. Change theme.`}
            >
              {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
            </button>
            <a
              href="https://github.com/ThanuMahee12/AgentContext"
              target="_blank"
              rel="noreferrer noopener"
            >
              Source
            </a>
          </div>
        </div>
      </aside>

      {/* Clicking away from an open drawer closes it. */}
      <button
        className="scrim"
        onClick={() => dispatch(setNavOpen(false))}
        tabIndex={-1}
        aria-hidden
      />

      <main className="sheet">
        <Outlet />
      </main>
    </div>
  )
}
