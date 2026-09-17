import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './components/Login'
import Admin from './pages/Admin'
import Published from './pages/Published'
import PublicLayout from './pages/public/Layout'
import Home from './pages/public/Home'
import Section from './pages/public/Section'
import { auth } from './firebase'
import { getSource } from './data/source'

/** Only the Firestore source needs a signed-in user. With fixtures or the empty
 *  source everything is local, and gating it would just obstruct development. */
const NEEDS_AUTH = getSource().name === 'firestore'

/**
 * Two sites behind one app.
 *
 *   /            public  - the knowledge base: home, brainstorms, KT,
 *                          discussions, notes. Content ships in the bundle.
 *   /s/:slug     public  - a published page from Firestore
 *   /admin       private - the session archive, sign-in required
 *
 * The public routes read no private collection at all. Sessions, notes,
 * context and credentials are denied to anonymous readers by firestore.rules,
 * so the split is enforced by the database rather than by which component the
 * router happens to mount.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/brainstorm" element={<Section id="brainstorms" />} />
          <Route path="/brainstorm/:docId" element={<Section id="brainstorms" />} />
          <Route path="/kt" element={<Section id="kt" />} />
          <Route path="/kt/:docId" element={<Section id="kt" />} />
          <Route path="/ideas" element={<Section id="discussions" />} />
          <Route path="/ideas/:docId" element={<Section id="discussions" />} />
          <Route path="/tech-commands" element={<Section id="notes" />} />
          <Route path="/tech-commands/:docId" element={<Section id="notes" />} />

          {/* Older paths stay working; they are linked from the repository. */}
          <Route path="/brainstorms" element={<Navigate to="/brainstorm" replace />} />
          <Route path="/discussions" element={<Navigate to="/ideas" replace />} />
          <Route path="/notes" element={<Navigate to="/tech-commands" replace />} />
          <Route path="/notes/:docId" element={<Navigate to="/tech-commands" replace />} />
        </Route>

        <Route path="/s/:slug" element={<Published />} />
        <Route path="/admin" element={<RequireAuth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RequireAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!NEEDS_AUTH)

  useEffect(() => {
    if (!NEEDS_AUTH) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
  }, [])

  if (!ready) return <p className="empty" style={{ paddingTop: 80 }}>Checking sign-in…</p>
  if (NEEDS_AUTH && !user) return <Login />
  return <Admin user={user} />
}
