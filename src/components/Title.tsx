import { Helmet } from 'react-helmet-async'

/** The document title for a route.
 *
 * Seven routes shared one static <title> from index.html, so every tab, every
 * bookmark and every back-button entry read "AgentContext" and nothing else.
 * A screen reader announces the same string on each navigation too - in a SPA
 * the title IS the page-change announcement, because no document load happens.
 *
 * Scope, deliberately: this sets the title and nothing more. og: and twitter:
 * tags were left out on purpose - Slack, iMessage and every other unfurler
 * fetches the HTML without running JavaScript, so a tag injected at runtime is
 * invisible to exactly the clients meta tags exist for. Making link previews
 * work needs prerendering, not another <meta>. Adding them here would only look
 * like the problem was solved.
 *
 * The site is also `noindex, nofollow` in both index.html and the Hosting
 * X-Robots-Tag header, so none of this is for search engines.
 */
export default function Title({ children }: { children?: string }) {
  const text = children?.trim()
  return (
    <Helmet>
      <title>{text ? `${text} · AgentContext` : 'AgentContext'}</title>
    </Helmet>
  )
}
