import { lazy, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'

import Decorative from './Decorative'
import Field from './Field'
import { auth } from '../firebase'
import { describeAuthError } from '../lib/authErrors'

/** three.js is ~547 kB and this is a page two people visit. Lazy, like
 *  CatchupScene - the backdrop arrives after the form is already usable, and
 *  never at all if the chunk fails to load. */
const AgentField = lazy(() => import('./AgentField'))

/** 1024px is Tailwind's `lg`, matching `hidden lg:flex` on the brand column
 *  and the media query in auth.css - all three must agree.
 *
 *  The brand column is display:none below this width, so the canvas would
 *  mount into a zero-sized box and pull 530 kB of three.js onto a phone for
 *  nothing. Read once: this is a page you arrive at, not one that gets resized
 *  mid-session, and re-mounting a WebGL context on every drag of a window edge
 *  would be worse than not reacting. */
const WIDE = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches

const SUBMIT =
  'mt-[22px] h-11 w-full cursor-pointer rounded-s bg-hue text-[14px] font-semibold ' +
  'tracking-[0.01em] text-ground transition-[filter] duration-150 ' +
  'hover:brightness-110 disabled:cursor-default disabled:opacity-55'
/* hue-lit, not hue: the base hue is 4.46:1 on a --surface card and fails AA. */
const LINK = 'cursor-pointer text-[13px] font-medium text-hue-lit hover:underline'
const NOTE = 'mb-[14px] text-[12.5px] leading-[1.6] text-text-muted'
const MESSAGE = 'mb-[14px] rounded-s border px-[11px] py-[9px] text-[12.5px] leading-[1.5]'

type Mode = 'signin' | 'reset' | 'request'

interface Fields {
  email: string
  password: string
}

/** What each mode calls itself and what its button does. Kept as data so the
 *  heading, the button and the busy label cannot drift out of step. */
const MODES: Record<Mode, { title: string; action: string; busy: string }> = {
  signin: { title: 'Sign in', action: 'Sign in', busy: 'Signing in…' },
  reset: { title: 'Reset your password', action: 'Send reset link', busy: 'Sending…' },
  request: { title: 'Request access', action: 'Copy request', busy: 'Copy request' },
}

const EMAIL_RULES = {
  required: 'Enter your email address.',
  pattern: { value: /^\S+@\S+\.\S+$/, message: 'That does not look like an email address.' },
}

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
export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [failure, setFailure] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, formState, setFocus } = useForm<Fields>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })
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
      await sendPasswordResetEmail(auth, address)
      setSentTo(address)
    } catch (err) {
      setFailure(describeAuthError(err, mode === 'reset' ? 'reset' : 'signin'))
    }
  })

  /* Through handleSubmit, so the address is validated before it is copied.
   * Reading the field directly would copy whatever is there - an empty field
   * produced "Please add  to the AgentContext viewer list.", a broken sentence
   * with a blank in it, and copied it happily. This also gives the field its
   * error message, since nothing else in this mode ever ran validation. */
  const copyRequest = handleSubmit(async ({ email }) => {
    setFailure('')
    try {
      await navigator.clipboard.writeText(
        `Please add ${email.trim()} to the AgentContext viewer list.`,
      )
      setCopied(true)
    } catch {
      setFailure('Could not reach the clipboard. Select the address and copy it by hand.')
    }
  })

  const copy = MODES[mode]

  return (
    /* The whole page is utilities: no stylesheet of its own. Two columns once
       there is room for the brand panel to say something without squeezing the
       form; below that the panel is hidden and the form takes the width. `lg`
       is 1024px and WIDE must agree with it. */
    <div className="tw-scope grid min-h-dvh grid-cols-1 bg-ground lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
      {/* Two columns: what this is, and the way in. The brand column is where
          the backdrop lives now - contained beside the form rather than behind
          it, which is what stopped it competing with the labels. */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-[var(--navy)] p-11 lg:flex lg:flex-col">
        {WIDE && (
          <Decorative>
            <Suspense fallback={null}>
              <AgentField />
            </Suspense>
          </Decorative>
        )}

        <div className="relative z-[1] flex items-center gap-[9px] text-[15px] font-semibold tracking-[-0.012em] text-text">
          <span className="size-[9px] rounded-full bg-hue" aria-hidden />
          AgentContext
        </div>

        <div className="relative z-[1] mt-auto">
          <p className="m-0 max-w-[18ch] text-[26px] leading-[1.32] tracking-[-0.02em] text-text">
            Every session your agents run, kept where you can read it back.
          </p>
          <p className="mt-[18px] max-w-[36ch] text-[13.5px] leading-[1.6] text-text-2">
            Commands, files and transcripts from Claude Code, Gemini CLI and Antigravity.
            Readable only by named addresses.
          </p>
        </div>
      </aside>

      <main className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-[360px]">
          {/* The wordmark only appears here when the brand column is not shown,
              so the page is never nameless and never says it twice. */}
          <div className="mb-9 flex items-center gap-[9px] text-[15px] font-semibold tracking-[-0.012em] text-text lg:hidden">
            <span className="size-[9px] rounded-full bg-hue" aria-hidden />
            AgentContext
          </div>

          <section aria-labelledby="auth-heading">
            <h1
              className="m-0 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-text"
              id="auth-heading"
            >
            {copy.title}
          </h1>
          {mode === 'signin' && (
            <p className="mt-[7px] text-[13.5px] leading-[1.55] text-text-muted">
              Access is limited to named addresses.
            </p>
          )}

          {mode === 'request' ? (
            <>
              <p className={NOTE + ' mt-6'}>
                Accounts are not created here. An owner adds your address to the viewer list,
                and you sign in with it afterwards.
              </p>

              <Field
                label="Your email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                registration={register('email', {
                  ...EMAIL_RULES,
                  required: 'Enter the address you want added.',
                })}
                error={errors.email?.message}
              />

              {failure && (
                <p className={MESSAGE + ' border-err/30 bg-err-soft text-err'} role="alert">
                  {failure}
                </p>
              )}

              <button className={SUBMIT} type="button" onClick={copyRequest}>
                {copied ? 'Copied' : copy.action}
              </button>

              <p className={NOTE + ' mb-0 mt-3'}>
                Nothing is sent from this page. Copying puts one line on your clipboard to pass
                to whoever runs the archive.
              </p>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-6">
              <Field
                label="Email"
                type="email"
                autoComplete="username"
                autoFocus
                registration={register('email', EMAIL_RULES)}
                error={errors.email?.message}
              />

              {mode === 'signin' && (
                <Field
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  registration={register('password', { required: 'Enter your password.' })}
                  error={errors.password?.message}
                  action={
                    <button type="button" className={LINK} onClick={() => go('reset')}>
                      Forgot it?
                    </button>
                  }
                />
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
                <p className={MESSAGE + ' border-err/30 bg-err-soft text-err'} role="alert">
                  {failure}
                </p>
              )}

              <button className={SUBMIT} type="submit" disabled={isSubmitting}>
                {isSubmitting ? copy.busy : copy.action}
              </button>
            </form>
          )}

          {/* An only child pushes itself right, so a single link never sits
              off-centre under the divider. */}
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
        </div>
      </main>
    </div>
  )
}
