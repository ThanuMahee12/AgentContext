import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import Shell from '../components/Shell'
import { FIRESTORE_HINT, Failure } from '../components/State'
import { describeError } from '../lib/queries'
import { sections, type KindId } from '../lib/sections'
import { useAppDispatch, useAppSelector } from '../store'
import { useContent } from '../lib/useContent'
import { setQuery } from '../store/uiSlice'

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
  const { query } = useAppSelector((s) => s.ui)
  const { content, ready, error } = useContent()
  const location = useLocation()
  const still = useReducedMotion()

  return (
    <Shell
      nav={
        <nav aria-label="Sections">
          {/* Every section is listed, empty ones included, with its count beside
              it. Hiding a section until it had content made the nav describe
              what is *published* rather than what the site holds - so a reader
              waiting on a document saw no Discussions entry at all, with
              nothing to say whether the section was empty or the read had
              failed. The section page answers that itself: "Nothing here
              yet." */}
          {sections.map((s) => (
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
                      transition={
                        still ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }
                      }
                    />
                  )}
                  <span className="label">{s.label}</span>
                  {s.id !== 'home' && (
                    // A dash until the read lands: "0" before it does claims every
                    // section is empty, which is exactly what a failed read looks like.
                    <span className="n">{ready ? content[s.id as KindId].length : '–'}</span>
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
      }
      aside={
        <label className="find">
          <span className="sr">Search</span>
          <input
            type="search"
            value={query}
            placeholder="Search"
            onChange={(e) => dispatch(setQuery(e.target.value))}
          />
        </label>
      }
      foot={
        <a
          className="src"
          href="https://github.com/ThanuMahee12/AgentContext"
          target="_blank"
          rel="noreferrer noopener"
        >
          Source
        </a>
      }
    >
      {/* Top right, out of the sidebar. It leaves the public site for an
            authenticated one, so it does not belong in a list of sections -
            and in the footer it read as a fourth utility beside search and
            the source link rather than the way in. */}
      <div className="mb-7 flex justify-end">
        <a
          href="/admin"
          className="inline-flex items-center gap-2 rounded-s border border-field-line px-3 py-1.5 text-[12.5px] font-medium text-text-2 no-underline hover:border-hue hover:text-text"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="flex-none"
          >
            <path
              d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor" />
          </svg>
          Sign in
        </a>
      </div>

      {/* Every public page is this one query. It used to fail into an empty
          site with no message at all - a denied read, a missing index and
          "nothing published yet" were indistinguishable. Shown once here
          rather than per page, because they all depend on it. */}
      {error && (
        <div className="mb-8">
          <Failure
            title="Could not load documents."
            detail={describeError(error)}
            hint={FIRESTORE_HINT}
          />
        </div>
      )}

      {/* Enter only, no exit. `mode="wait"` held every navigation until the
          outgoing page had finished animating away, so each click paid ~220ms
          before the next page could even start to render. */}
      <motion.div
        key={location.pathname}
        initial={still ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: still ? 0 : 0.18, ease: [0.2, 0.7, 0.3, 1] }}
      >
        <Outlet />
      </motion.div>
    </Shell>
  )
}
