/** The Agentix mark.
 *
 * A session spawning subagents - the one relationship the data model is built
 * around, and the same shape `AgentField` animates behind the sign-in form. The
 * tab icon, the public wordmark and the admin bar now draw the same thing.
 *
 * Inline SVG rather than a background-image so it takes `currentColor`, which
 * is what lets one file sit on the navy bar and the dark ground without a
 * second asset. `public/icon.svg` is the same geometry with the accent baked
 * in, because a favicon cannot inherit anything.
 *
 * It replaced four CSS gradient stripes. Those said "pipeline layers", which
 * was true of the content but said nothing about what this app is.
 */
export default function Mark({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="flex-none"
    >
      {/* Tethers under the nodes; the filled circles cover the ends. */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.55">
        <line x1="10.5" y1="16" x2="23.5" y2="7.5" />
        <line x1="10.5" y1="16" x2="23.5" y2="24.5" />
      </g>
      <g fill="currentColor">
        <circle cx="10.5" cy="16" r="5.6" />
        <circle cx="23.5" cy="7.5" r="3.6" />
        <circle cx="23.5" cy="24.5" r="3.6" />
      </g>
    </svg>
  )
}
