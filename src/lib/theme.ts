/** Reading the design tokens from code.
 *
 * Both three.js scenes need the palette as values, not as CSS. They each did
 * it themselves, and drifted: the same token `--line-lit` had two different
 * fallbacks (#33405a in one, #2f3a4f in the other, and the second matches
 * nothing in tokens.css), and `--hue` fell back to the magenta in one scene
 * and the notes blue in the other.
 *
 * A fallback is only reached when a custom property does not resolve - an
 * element outside the cascade, a very old browser - which is exactly when
 * nobody is watching, so a wrong one sits there for months. Here they are one
 * table, and every value is copied from tokens.css rather than invented.
 */

/** The tokens a scene may read, with their values from tokens.css.
 *
 *  `--hue` is one colour app-wide now, so these are simply its value. The one
 *  rule that matters: it must never fall back to the magenta this project
 *  moved off. */
const FALLBACK = {
  '--hue': '#6f93d6',
  '--ground': '#0b0f16',
  '--surface': '#131925',
  '--line-lit': '#33405a',
  '--navy': '#0f1a30',
} as const

export type ThemeToken = keyof typeof FALLBACK

/** One token, as a colour string three.js can parse.
 *
 *  `getComputedStyle` resolves the whole var() chain, so a scene inside
 *  `[data-section]` gets that section's hue without knowing which section it
 *  is in. */
export function readToken(el: Element, name: ThemeToken): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim()
  return value || FALLBACK[name]
}

/** Several at once, which is what a scene actually wants at startup. */
export function readTheme<T extends ThemeToken>(
  el: Element,
  names: readonly T[],
): Record<T, string> {
  const css = getComputedStyle(el)
  const out = {} as Record<T, string>
  for (const name of names) out[name] = css.getPropertyValue(name).trim() || FALLBACK[name]
  return out
}
