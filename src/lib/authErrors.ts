/** Firebase auth error codes, said in words.
 *
 *  Separate from the component because it is a pure mapping with one rule
 *  worth stating in one place, away from markup.
 */
export type AuthAction = 'signin' | 'reset'

export function describeAuthError(err: unknown, action: AuthAction): string {
  const code = (err as { code?: string })?.code ?? ''

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/missing-password':
      return 'Enter your password.'

    // One message for all three, deliberately. Saying which half was wrong
    // tells an attacker which addresses have accounts.
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
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
      if (code) return `${action === 'reset' ? 'Reset' : 'Sign-in'} failed (${code}).`
      return action === 'reset' ? 'Could not send the reset link.' : 'Sign-in failed.'
  }
}
