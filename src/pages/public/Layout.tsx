import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { sections } from '../../content'
import { useAppDispatch, useAppSelector } from '../../store'
import { setNavOpen, setQuery, setTheme, type Theme } from '../../store/uiSlice'

/** The public shell.
 *
 *  A persistent section rail on wide screens; on narrow ones it becomes a row
 *  of tabs that scrolls horizontally, because five sections do not fit and a
 *  hamburger would hide the site's entire structure behind a tap.
 */
export default function PublicLayout() {
  const dispatch = useAppDispatch()
  const { query, theme } = useAppSelector((s) => s.ui)
  const location = useLocation()

  // Reading position belongs to the page, not the session.
  useEffect(() => {
    window.scrollTo(0, 0)
    dispatch(setNavOpen(false))
  }, [location.pathname, dispatch])

  const cycle: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }

  return (
    <div className="site">
      <header className="sitehead">
        <Link to="/" className="wordmark">
          AgentContext
        </Link>

        <label className="find">
          <span className="sr">Search</span>
          <input
            type="search"
            value={query}
            placeholder="Search everything"
            onChange={(e) => dispatch(setQuery(e.target.value))}
          />
        </label>

        <button
          className="ghost"
          onClick={() => dispatch(setTheme(cycle[theme]))}
          aria-label={`Theme: ${theme}. Change theme.`}
        >
          {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
        </button>
      </header>

      <nav className="rail" aria-label="Sections">
        {sections.map((s) => (
          <NavLink
            key={s.id}
            to={s.path}
            end={s.path === '/'}
            className={({ isActive }) => 'railitem' + (isActive ? ' on' : '')}
            data-section={s.id}
          >
            <span className="mark" aria-hidden />
            <span className="label">{s.label}</span>
            {s.count > 0 && <span className="n">{s.count}</span>}
          </NavLink>
        ))}
      </nav>

      <main className="sheet">
        <Outlet />
      </main>

      <footer className="sitefoot">
        <span>Working notes, discussions and reference material.</span>
        <a href="https://github.com/ThanuMahee12/AgentContext" target="_blank" rel="noreferrer noopener">
          Source
        </a>
      </footer>
    </div>
  )
}
