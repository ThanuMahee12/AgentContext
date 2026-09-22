import type { ReactNode } from 'react'

/** The three things every data-backed screen renders before it renders content:
 *  loading, failed, and nothing-to-show.
 *
 *  These existed as copy-pasted markup on five screens, including the magic
 *  `paddingTop: 80` that keeps a full-page message clear of the fixed header -
 *  a number that was right in four places and absent in the fifth.
 *
 *  `Empty` in `shared.tsx` is a different thing and stays where it is: it is
 *  about a FILTER matching nothing and offers to clear the search. `Nothing`
 *  here is for a collection that is genuinely empty.
 */

/** A pending read.
 *
 *  `page` lifts the message clear of the fixed header for a whole-screen wait;
 *  leave it off inside a panel that is already positioned. */
export function Loading({ children = 'Loading…', page = false }: { children?: ReactNode; page?: boolean }) {
  return (
    // aria-busy + role=status so a screen reader announces the wait instead of
    // sitting silent until content appears.
    <p className="empty" role="status" aria-busy="true" style={page ? { paddingTop: 80 } : undefined}>
      {children}
    </p>
  )
}

/** A collection with nothing in it. Not a filter that matched nothing. */
export function Nothing({ children, page = false }: { children: ReactNode; page?: boolean }) {
  return (
    <p className="empty" style={page ? { paddingTop: 80 } : undefined}>
      {children}
    </p>
  )
}

/** A read that failed.
 *
 *  `hint` is the part worth keeping: a Firebase permission error and a missing
 *  index look identical to anyone who has not hit both before, and the fix is
 *  completely different. */
export function Failure({
  title = 'Could not load data.',
  detail,
  hint,
}: {
  title?: string
  detail?: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="failure" role="alert">
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

/** The standing explanation for a failed Firestore read on this project. */
export const FIRESTORE_HINT = (
  <>
    A permission error means the signed-in account is not the one named in
    firestore.rules. A failed-precondition error means a query needs an index that has not been
    built.
  </>
)

/** A small labelled pill.
 *
 *  Three files spelled this by hand as `<span className="chip">`, one of them
 *  with a conditional `accent` modifier. */
export function Chip({
  children,
  accent = false,
  title,
}: {
  children: ReactNode
  accent?: boolean
  title?: string
}) {
  return (
    <span className={'chip' + (accent ? ' accent' : '')} title={title}>
      {children}
    </span>
  )
}
