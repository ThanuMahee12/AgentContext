import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

/**
 * A labelled text input with its validation message.
 *
 * Written out three times in the sign-in form before this existed, and the
 * third copy had drifted: it set `aria-invalid` but rendered no message and
 * wired no `aria-describedby`, so a rejected address showed a red border and
 * no reason. Wiring the id here means the three cannot disagree again - the
 * association is not something a call site can forget.
 *
 * `useId` rather than a hand-written id: two Fields with the same label on one
 * screen would otherwise point at the same element.
 */
const LABEL = 'mb-[7px] block text-[13px] font-medium text-text-2'

const INPUT =
  'h-11 w-full rounded-s border border-line bg-raised px-[13px] text-[15px] text-text ' +
  'outline-none transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-text-muted ' +
  'focus:border-hue focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--hue)_22%,transparent)] ' +
  'aria-[invalid=true]:border-err ' +
  'aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--err)_22%,transparent)]'

/* not-italic because <em> is the right element for an inline emphasis the
   browser italicises by default; the meaning is wanted, the slant is not. */
const HINT = 'mt-[6px] block text-[12px] not-italic leading-[1.5] text-err'

export default function Field({
  label,
  error,
  action,
  registration,
  ...input
}: {
  label: string
  /** The message to show. Its presence is what marks the field invalid. */
  error?: string
  /** Something to sit opposite the label, such as a "Forgot it?" link. */
  action?: ReactNode
  /** The result of react-hook-form's `register()`. */
  registration?: UseFormRegisterReturn
} & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = useId()

  return (
    <label className="mb-[18px] block">
      <span className={LABEL + (action ? ' flex items-baseline justify-between gap-[10px]' : '')}>
        {label}
        {action}
      </span>
      <input
        {...registration}
        {...input}
        className={INPUT}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <em id={errorId} className={HINT}>
          {error}
        </em>
      )}
    </label>
  )
}
