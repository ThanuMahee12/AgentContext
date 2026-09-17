/** Images, video and embeds inside markdown.
 *
 *  Embeds are restricted to an allowlist of hosts. The content is ours and
 *  reaches the page through an owner-only Firestore write, but an <iframe>
 *  renders whatever it is pointed at inside our origin's page, and a public
 *  site should not be one content edit away from framing anything at all. A
 *  host that is not on the list renders as a plain link rather than silently
 *  disappearing, so nothing is ever lost without the author noticing.
 */

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i
const VIDEO = /\.(mp4|webm|ogv|mov)(\?|#|$)/i

/** host -> how to turn a page URL into its embeddable form. */
const EMBEDS: Array<{ test: RegExp; src: (u: URL) => string | null; title: string }> = [
  {
    title: 'YouTube',
    test: /(^|\.)(youtube\.com|youtu\.be)$/i,
    src: (u) => {
      const id = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v') || (u.pathname.match(/\/embed\/([\w-]+)/) || [])[1]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    },
  },
  {
    title: 'Vimeo',
    test: /(^|\.)vimeo\.com$/i,
    src: (u) => {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    },
  },
  {
    title: 'Loom',
    test: /(^|\.)loom\.com$/i,
    src: (u) => u.pathname.replace('/share/', '/embed/') ? `https://www.loom.com${u.pathname.replace('/share/', '/embed/')}` : null,
  },
  {
    title: 'CodePen',
    test: /(^|\.)codepen\.io$/i,
    src: (u) => `https://codepen.io${u.pathname.replace('/pen/', '/embed/')}`,
  },
  {
    title: 'Excalidraw',
    test: /(^|\.)excalidraw\.com$/i,
    src: (u) => u.href,
  },
  {
    title: 'Figma',
    test: /(^|\.)figma\.com$/i,
    src: (u) => `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u.href)}`,
  },
]

export function classify(url: string): 'image' | 'video' | 'embed' | 'link' {
  if (IMAGE.test(url)) return 'image'
  if (VIDEO.test(url)) return 'video'
  return embedSrc(url) ? 'embed' : 'link'
}

function parsed(url: string): URL | null {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

export function embedSrc(url: string): { src: string; title: string } | null {
  const u = parsed(url)
  if (!u) return null
  for (const e of EMBEDS) {
    if (e.test.test(u.hostname)) {
      const src = e.src(u)
      if (src) return { src, title: e.title }
    }
  }
  return null
}

export function Figure({ url, alt }: { url: string; alt: string }) {
  const kind = classify(url)

  if (kind === 'image') {
    return (
      <figure className="fig">
        <img src={url} alt={alt} loading="lazy" decoding="async" />
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    )
  }

  if (kind === 'video') {
    return (
      <figure className="fig">
        {/* No autoplay: a page that starts making noise on its own is a
            misfeature, and muted autoplay still burns a visitor's data. */}
        <video src={url} controls preload="metadata" playsInline />
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    )
  }

  const embed = embedSrc(url)
  if (embed) {
    return (
      <figure className="fig embed">
        <div className="frame">
          <iframe
            src={embed.src}
            title={alt || embed.title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          />
        </div>
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    )
  }

  // Not an allowlisted host. Show it rather than drop it.
  return (
    <p className="fig-fallback">
      <a href={url} target="_blank" rel="noreferrer noopener">
        {alt || url}
      </a>
    </p>
  )
}
