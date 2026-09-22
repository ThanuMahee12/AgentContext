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
/* Utility strings, named once. Repeating a 12-class input three times is how
 * two fields end up a pixel apart; naming them is not a component library, it
 * is the same discipline as a CSS class. */
const LABEL = 'mb-[7px] block text-[13px] font-medium text-text-2'
const INPUT =
  'h-11 w-full rounded-s border border-line bg-raised px-[13px] text-[15px] text-text ' +
  'outline-none transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-text-muted ' +
  'focus:border-hue focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--hue)_22%,transparent)] ' +
  'aria-[invalid=true]:border-err ' +
  'aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--err)_22%,transparent)]'
const SUBMIT =
  'mt-[22px] h-11 w-full cursor-pointer rounded-s bg-hue text-[14px] font-semibold ' +
  'tracking-[0.01em] text-ground transition-[filter] duration-150 ' +
  'hover:brightness-110 disabled:cursor-default disabled:opacity-55'
/* hue-lit, not hue: the base hue is 4.46:1 on a --surface card and fails AA. */
const LINK = 'cursor-pointer text-[13px] font-medium text-hue-lit hover:underline'
const NOTE = 'mb-[14px] text-[12.5px] leading-[1.6] text-text-muted'
const HINT = 'mt-[6px] block text-[12px] not-italic leading-[1.5] text-err'
const MESSAGE = 'mb-[14px] rounded-s border px-[11px] py-[9px] text-[12.5px] leading-[1.5]'

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

      {/* tw-scope carries the preflight subset these utilities assume - this
          project does not import preflight globally. See styles/tailwind-plus.css. */}
      <main className="tw-scope relative z-[1] w-full max-w-[400px]">
        <div className="flex items-center gap-[9px] text-[15px] font-semibold tracking-[-0.012em] text-text">
          <span className="size-[9px] rounded-full bg-hue" aria-hidden />
          AgentContext
        </div>

        <section
          className="mt-[26px] rounded border border-line bg-surface p-[30px] pb-6 shadow-[0_10px_34px_-18px_rgb(0_0_0/0.85)]"
          aria-labelledby="auth-heading"
        >
          <h1
            className="m-0 text-[21px] font-semibold leading-tight tracking-[-0.02em] text-text"
            id="auth-heading"
          >
            {mode === 'signin' ? 'Sign in' : mode === 'reset' ? 'Reset your password' : 'Request access'}
          </h1>
          {mode === 'signin' && (
            <p className="mt-[7px] text-[13.5px] leading-[1.55] text-text-muted">
              Access is limited to named addresses.
            </p>
          )}

          {mode === 'request' ? (
            <RequestAccess
              register={register}
              copied={copied}
              onCopy={copyRequest}
              invalid={!!errors.email}
            />
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-6">
              <label className="mb-[18px] block">
                <span className={LABEL}>Email</span>
                <input
                  {...register('email', {
                    required: 'Enter your email address.',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'That does not look like an email address.' },
                  })}
                  type="email"
                  autoComplete="username"
                  autoFocus
                  className={INPUT}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'err-email' : undefined}
                />
                {errors.email && <em id="err-email" className={HINT}>{errors.email.message}</em>}
              </label>

              {mode === 'signin' && (
                <label className="mb-[18px] block">
                  <span className={LABEL + ' flex items-baseline justify-between gap-[10px]'}>
                    Password
                    <button type="button" className={LINK} onClick={() => go('reset')}>
                      Forgot it?
                    </button>
                  </span>
                  <input
                    {...register('password', { required: 'Enter your password.' })}
                    type="password"
                    autoComplete="current-password"
                    className={INPUT}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'err-password' : undefined}
                  />
                  {errors.password && <em id="err-password" className={HINT}>{errors.password.message}</em>}
                </label>
              )}

              {mode === 'reset' && !sentTo && (
                <p className={NOTE}>
                  We send a link to this address if an account uses it. The link expires in an hour.
                </p>
              )}

              {sentTo && (
                <p className={MESSAGE + ' border-ok/30 bg-ok-soft text-ok'} role="status">
                  Check {sentTo} for the reset link. It expires in an hour.
                </p>
              )}

              {failure && (
                <p className={MESSAGE + ' border-err/30 bg-err-soft text-err'} role="alert">{failure}</p>
              )}

              <button className={SUBMIT} type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === 'signin' ? 'Signing in…' : 'Sending…'
                  : mode === 'signin' ? 'Sign in' : 'Send reset link'}
              </button>
            </form>
          )}

          {/* justify-end plus an auto margin on a lone child keeps a single
              link off-centre-free without a :only-child rule. */}
          <nav className="mt-[22px] flex justify-between gap-3 border-t border-line pt-[18px] [&>*:only-child]:ml-auto">
            {mode !== 'signin' && (
              <button type="button" className={LINK} onClick={() => go('signin')}>
                Back to sign in
              </button>
            )}
            {mode !== 'request' && (
              <button type="button" className={LINK} onClick={() => go('request')}>
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
      <p className={NOTE + ' mt-6'}>
        Accounts are not created here. An owner adds your address to the viewer list, and
        you sign in with it afterwards.
      </p>

      <label className="mb-[18px] block">
        <span className={LABEL}>Your email</span>
        <input
          {...register('email', { required: 'Enter the address you want added.' })}
          type="email"
          autoComplete="email"
          className={INPUT}
          aria-invalid={invalid}
          placeholder="you@example.com"
        />
      </label>

      <button className={SUBMIT} type="button" onClick={onCopy}>
        {copied ? 'Copied' : 'Copy request'}
      </button>

      <p className={NOTE + ' mb-0 mt-3'}>
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
