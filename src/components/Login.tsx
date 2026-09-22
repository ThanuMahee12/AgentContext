import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'

import { auth } from '../firebase'

/** three.js is ~547 kB and this is a page two people visit. Lazy, like
 *  CatchupScene - the backdrop arrives after the form is already usable, and
 *  never at all if the chunk fails to load. */
const AgentField = lazy(() => import('./AgentField'))

/**
 * The door to the archive.
 *
 * Three modes on one panel, because they are the same conversation: prove who
 * you are, recover the means to, or ask to be let in at all.
 *
 * There is still no self-registration. Access is an allow-list of addresses in
 * firestore.rules, and sign-up is switched off in the Firebase console - an
 * account created here could sign in and read nothing. So "Request access"
 * says that plainly instead of offering a form that would fail with
 * `auth/admin-restricted-operation`, and it sends nothing: there is no backend
 * to receive a request, and a button that silently does nothing is worse than
 * one that explains itself.
 */
type Mode = 'signin' | 'reset' | 'request'

interface Fields {
  email: string
  password: string
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [failure, setFailure] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [copied, setCopied] = useState(false)

  const form = useForm<Fields>({ defaultValues: { email: '', password: '' }, mode: 'onSubmit' })
  const { register, handleSubmit, formState, getValues, setFocus } = form
  const { errors, isSubmitting } = formState

  const go = (next: Mode) => {
    setMode(next)
    setFailure('')
    setSentTo('')
    setCopied(false)
    // The heading changes but the fields look similar, so move focus to prove
    // the mode actually changed for anyone not watching the heading.
    setTimeout(() => setFocus('email'), 0)
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFailure('')
    const address = email.trim()
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, address, password)
        return // the auth listener in App swaps this whole view out
      }
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, address)
        setSentTo(address)
      }
    } catch (err) {
      setFailure(explain(err, mode))
    }
  })

  const copyRequest = async () => {
    const address = getValues('email').trim()
    try {
      await navigator.clipboard.writeText(
        `Please add ${address} to the AgentContext viewer list.`,
      )
      setCopied(true)
    } catch {
      setFailure('Could not reach the clipboard. Select the address and copy it by hand.')
    }
  }

  return (
    // data-section makes --hue the dashboard's own magenta, the way every
    // other area of the site takes its colour.
    <div className="auth" data-section="dashboard">
      {/* Decorative, deferred, and firewalled. No Suspense fallback because a
          form that waits for a backdrop is a form that failed, and the boundary
          means a throw inside the canvas cannot take sign-in down with it. */}
      <Decorative>
        <Suspense fallback={null}>
          <AgentField />
        </Suspense>
      </Decorative>

      <main className="auth-col">
        <div className="auth-mark">
          <span className="auth-dot" aria-hidden />
          AgentContext
        </div>

        <section className="auth-panel" aria-labelledby="auth-heading">
          <h1 className="auth-title" id="auth-heading">
            {mode === 'signin' ? 'Sign in' : mode === 'reset' ? 'Reset your password' : 'Request access'}
          </h1>
          {mode === 'signin' && (
            <p className="auth-sub">Access is limited to named addresses.</p>
          )}

          {mode === 'request' ? (
            <RequestAccess
              register={register}
              copied={copied}
              onCopy={copyRequest}
              invalid={!!errors.email}
            />
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <label className="auth-field">
                <span>Email</span>
                <input
                  {...register('email', {
                    required: 'Enter your email address.',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'That does not look like an email address.' },
                  })}
                  type="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'err-email' : undefined}
                />
                {errors.email && <em id="err-email" className="auth-hint">{errors.email.message}</em>}
              </label>

              {mode === 'signin' && (
                <label className="auth-field">
                  <span className="auth-label-row">
                    Password
                    <button type="button" className="auth-link" onClick={() => go('reset')}>
                      Forgot it?
                    </button>
                  </span>
                  <input
                    {...register('password', { required: 'Enter your password.' })}
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'err-password' : undefined}
                  />
                  {errors.password && <em id="err-password" className="auth-hint">{errors.password.message}</em>}
                </label>
              )}

              {mode === 'reset' && !sentTo && (
                <p className="auth-note">
                  We send a link to this address if an account uses it. The link expires in an hour.
                </p>
              )}

              {sentTo && (
                <p className="auth-ok" role="status">
                  Check {sentTo} for the reset link. It expires in an hour.
                </p>
              )}

              {failure && <p className="auth-error" role="alert">{failure}</p>}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === 'signin' ? 'Signing in…' : 'Sending…'
                  : mode === 'signin' ? 'Sign in' : 'Send reset link'}
              </button>
            </form>
          )}

          <nav className="auth-switch">
            {mode !== 'signin' && (
              <button type="button" className="auth-link" onClick={() => go('signin')}>
                Back to sign in
              </button>
            )}
            {mode !== 'request' && (
              <button type="button" className="auth-link" onClick={() => go('request')}>
                No account?
              </button>
            )}
          </nav>
        </section>
      </main>
    </div>
  )
}

/** Renders nothing if its child throws.
 *
 *  For decoration only. The sign-in form is the one thing on this page that has
 *  to work, and a WebGL context failure, a missing browser API or a chunk that
 *  will not load must cost the reader a backdrop, never the ability to sign in.
 *  React unmounts the whole tree on an uncaught render error, so without this
 *  the canvas and the form share a fate. */
class Decorative extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Deliberately not a sign-up form. See the note at the top of this file. */
function RequestAccess({
  register,
  copied,
  onCopy,
  invalid,
}: {
  register: ReturnType<typeof useForm<Fields>>['register']
  copied: boolean
  onCopy: () => void
  invalid: boolean
}) {
  return (
    <>
      <p className="auth-note">
        Accounts are not created here. An owner adds your address to the viewer list, and
        you sign in with it afterwards.
      </p>

      <label className="auth-field">
        <span>Your email</span>
        <input
          {...register('email', { required: 'Enter the address you want added.' })}
          type="email"
          autoComplete="email"
          aria-invalid={invalid}
          placeholder="you@example.com"
        />
      </label>

      <button className="auth-submit" type="button" onClick={onCopy}>
        {copied ? 'Copied' : 'Copy request'}
      </button>

      <p className="auth-note auth-note-quiet">
        Nothing is sent from this page. Copying puts one line on your clipboard to pass to
        whoever runs the archive.
      </p>
    </>
  )
}

/** Firebase error codes are not for humans. Say what to do about it. */
function explain(err: unknown, mode: Mode): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/missing-password':
      return 'Enter your password.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      // One message for all three on purpose: saying which half was wrong tells
      // an attacker which addresses have accounts.
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your connection.'
    case 'auth/admin-restricted-operation':
      return 'Account creation is switched off for this project.'
    case 'auth/configuration-not-found':
      return 'Email sign-in is not enabled for this Firebase project yet.'
    default:
      if (code) return `${mode === 'reset' ? 'Reset' : 'Sign-in'} failed (${code}).`
      return mode === 'reset' ? 'Could not send the reset link.' : 'Sign-in failed.'
  }
}
