/** Control styling, named once.
 *
 * Six components were each spelling out their own input and their own
 * link-button, and the three text inputs had already drifted apart by a pixel
 * of padding and a step of font size. Utility classes do not stop that on their
 * own - they just move the copy-paste from a stylesheet into JSX.
 *
 * Strings rather than components, deliberately. `react-datepicker` takes a
 * `className` and renders its own `<input>`; a `<TextInput>` component could
 * not be used there at all. A string composes everywhere a class can go.
 *
 * Callers append what is contextual - width, and the background, which depends
 * on whether the control sits on --surface or inside a --surface panel.
 */

/** Shared by every text input: the visible edge, the focus colour, and a
 *  placeholder that clears AA (--text-3 is 3.59:1 on a card). */
const inputBase =
  'rounded-s border border-field-line text-text outline-none ' +
  'placeholder:text-text-muted focus:border-hue'

/** Toolbar and filter scale. */
export const inputSm = `${inputBase} h-8 px-2.5 text-[13px]`

/** Form scale. 44px is the comfortable target; the ring is drawn as a shadow
 *  rather than a thicker border so the field does not shift by a pixel when it
 *  takes focus, and the invalid state re-colours both. */
export const inputLg =
  `${inputBase} h-11 w-full px-[13px] text-[15px] ` +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--hue)_22%,transparent)] ' +
  'aria-[invalid=true]:border-err ' +
  'aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--err)_22%,transparent)]'

/** A button that reads as a link. hue-lit, not hue: the base accent is 4.46:1
 *  on a --surface card and fails AA. */
export const linkButton =
  'cursor-pointer text-[12.5px] font-medium text-hue-lit hover:text-text'

/** A bordered button: sign out, the facet trigger, anything secondary. */
export const outlineButton =
  'inline-flex cursor-pointer items-center gap-[7px] rounded-s border border-field-line ' +
  'px-[11px] py-1.5 text-[12.5px] font-medium text-text-2 hover:border-hue hover:text-text'

/** The one filled button on the site, on the sign-in form. */
export const primaryButton =
  'h-11 w-full cursor-pointer rounded-s bg-hue text-[14px] font-semibold ' +
  'tracking-[0.01em] text-ground transition-[filter] duration-150 ' +
  'hover:brightness-110 disabled:cursor-default disabled:opacity-55'

/** A row of filters, and the menu one opens. */
export const menuPanel =
  'z-20 w-max min-w-[210px] max-w-[320px] rounded border border-line-lit bg-surface p-2 ' +
  'shadow-[0_14px_36px_-16px_rgb(0_0_0/0.9)]'
