import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './components/Login'
import Admin from './pages/Admin'
import Catchup from './pages/Catchup'
import ContentAdmin from './pages/ContentAdmin'
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
 *   /catchup     private - the same archive as a calendar, day by day
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
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/brainstorm" element={<Section id="brainstorms" />} />
          <Route path="/brainstorm/*" element={<Section id="brainstorms" />} />
          <Route path="/kt" element={<Section id="kt" />} />
          <Route path="/kt/*" element={<Section id="kt" />} />
          <Route path="/ideas" element={<Section id="discussions" />} />
          <Route path="/ideas/*" element={<Section id="discussions" />} />
          <Route path="/tech-commands" element={<Section id="notes" />} />
          <Route path="/tech-commands/*" element={<Section id="notes" />} />

          {/* Older paths stay working; they are linked from the repository. */}
          <Route path="/brainstorms" element={<Navigate to="/brainstorm" replace />} />
          <Route path="/discussions" element={<Navigate to="/ideas" replace />} />
          <Route path="/notes" element={<Navigate to="/tech-commands" replace />} />
          <Route path="/notes/*" element={<Navigate to="/tech-commands" replace />} />
        </Route>

        <Route path="/s/:slug" element={<Published />} />
        <Route path="/admin" element={<RequireAuth render={(u) => <Admin user={u} />} />} />
        <Route path="/catchup" element={<RequireAuth render={(u) => <Catchup user={u} />} />} />
        <Route path="/content" element={<RequireAuth render={() => <ContentAdmin />} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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

  if (!ready) return <p className="empty" style={{ paddingTop: 80 }}>Checking sign-in…</p>
  if (NEEDS_AUTH && !user) return <Login />
  return render(user)
}
