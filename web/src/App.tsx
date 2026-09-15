import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './components/Login'
import Admin from './pages/Admin'
import Public from './pages/Public'
import Published from './pages/Published'
import { auth } from './firebase'
import { getSource } from './data/source'

/** Only the Firestore source needs a signed-in user. With fixtures or the empty
 *  source everything is local, and gating it would just obstruct development. */
const NEEDS_AUTH = getSource().name === 'firestore'

/**
 * Two audiences, split by route.
 *
 *   /           public  - lists only what has been explicitly published
 *   /s/:slug    public  - one published page
 *   /admin      private - the full session archive, sign-in required
 *
 * The public routes read the `public` collection and nothing else, which is
 * the only collection the Firestore rules expose. Sessions, context, memory and
 * credentials have no public read path at all - so this split is enforced by
 * the database, not merely by which component the router happens to render.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Public />} />
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
