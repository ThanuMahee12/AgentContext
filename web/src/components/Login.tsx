import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

/** Sign-in gate.
 *
 *  There is no "create account" path on purpose. Accounts are provisioned in
 *  the Firebase console; this dashboard reads one person's session history and
 *  self-registration would only widen who can attempt to reach it.
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  return (
    <div className="loginwrap">
      <form className="loginbox" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <span className="dot" />
          AgentContext
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="loginerr">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

/** Firebase error codes are not for humans. Say what to do about it. */
function explain(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your connection.'
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not enabled for this project yet. Enable Email/Password in the Firebase console.'
    default:
      return code ? `Sign-in failed (${code}).` : 'Sign-in failed.'
  }
}
