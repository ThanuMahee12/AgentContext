import { lazy, Suspense, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './components/Login'
import { Loading } from './components/State'
import Catchup from './pages/Catchup'
import Published from './pages/Published'
import PublicLayout from './pages/Layout'
import Home from './pages/Home'
import Section from './pages/Section'
import { auth } from './firebase'
import { getSource } from './lib/source'
import { kinds } from './lib/sections'

/** The signed-in screens are split out of the entry chunk.
 *
 *  They carry the session table, the filter menus and everything those pull in
 *  - TanStack Table, Headless UI, floating-ui - none of which a signed-out
 *  visitor reading a document has any use for. The public site was downloading
 *  the whole archive UI to render a page of markdown. */
const Admin = lazy(() => fresh(() => import('./pages/Admin')))
const ContentAdmin = lazy(() => fresh(() => import('./pages/ContentAdmin')))

/** A lazy chunk that survives a deploy.
 *
 *  Chunk names are content hashes. A tab opened before a deploy still holds the
 *  old entry, so its first visit to /admin asks for a chunk that no longer
 *  exists - and the `**` rewrite answers with index.html, which `nosniff`
 *  refuses to run as a script. The import rejects and the page goes blank.
 *  Reloading once fetches the new entry; the flag stops a genuinely missing
 *  chunk from looping. */
function fresh<T>(load: () => Promise<T>): Promise<T> {
  const flag = 'agentix:chunk-reload'
  return load().then(
    (m) => {
      try {
        sessionStorage.removeItem(flag)
      } catch {}
      return m
    },
    (err) => {
      try {
        if (!sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, '1')
          window.location.reload()
          return new Promise<T>(() => {})
        }
      } catch {}
      throw err
    },
  )
}

/** Only the Firestore source needs a signed-in user. With fixtures or the empty
 *  source everything is local, and gating it would just obstruct development. */
const NEEDS_AUTH = getSource().name === 'firestore'

/**
 * Two sites behind one app.
 *
 *   /            public  - the knowledge base: home, then one section per
 *                          content kind (lib/sections.ts). Read from Firestore.
 *   /s/:slug     public  - a published page from Firestore
 *   /admin       private - the session archive, sign-in required
 *   /catchup     public  - a calendar of activity; counts for anyone, the
 *                          conversations themselves only once signed in
 *   /content     private - promote a document to the public page, or pull it back
 *
 * The public routes read no private collection at all. Sessions, notes,
 * context and credentials are denied to anonymous readers by firestore.rules,
 * so the split is enforced by the database rather than by which component the
 * router happens to mount.
 */
export default function App() {
  return (
    <BrowserRouter>
      {/* The signed-in screens are lazy, so they need a boundary. The public
          routes are not split and never reach the fallback. */}
      <Suspense fallback={<Loading page />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            {kinds.flatMap((k) => [
              <Route key={k.id} path={k.path} element={<Section id={k.id} />} />,
              <Route key={k.id + '/*'} path={`${k.path}/*`} element={<Section id={k.id} />} />,
            ])}
            <Route path="/catchup" element={<Catchup />} />

            {/* Older paths stay working; they are linked from the repository.
                KT and Tech Commands are gone as sections - commands are
                searchable from the session archive - so they land on Home. */}
            <Route path="/brainstorm/*" element={<Navigate to="/brainstorms" replace />} />
            <Route path="/kt/*" element={<Navigate to="/" replace />} />
            <Route path="/tech-commands/*" element={<Navigate to="/" replace />} />
            <Route path="/notes/*" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="/s/:slug" element={<Published />} />
          <Route path="/admin" element={<RequireAuth render={(u) => <Admin user={u} />} />} />
          <Route
            path="/content"
            element={<RequireAuth render={(u) => <ContentAdmin user={u} />} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function RequireAuth({ render }: { render: (user: User | null) => JSX.Element }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!NEEDS_AUTH)

  useEffect(() => {
    if (!NEEDS_AUTH) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
  }, [])

  if (!ready) return <Loading page>Checking sign-in…</Loading>
  if (NEEDS_AUTH && !user) return <Login />
  return render(user)
}
