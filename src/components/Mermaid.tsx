import { useEffect, useId, useState } from 'react'

import CodeBlock from './CodeBlock'

/** A ```mermaid fence, drawn.
 *
 *  Mermaid is ~600 KB, and most documents have no diagram, so it is imported
 *  here on first use rather than from the entry chunk - a reader of a page of
 *  prose never downloads it.
 *
 *  `securityLevel: 'strict'` is what makes injecting its SVG acceptable: it
 *  strips HTML labels and click handlers, so a diagram in a published document
 *  cannot carry script. If rendering fails - a syntax error in the source -
 *  the source is shown as code instead, because a broken diagram with its text
 *  is still worth more than a blank. */
export default function Mermaid({ code }: { code: string }) {
  const id = 'mmd-' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })
        // Parse first: render() on bad source appends its own error graphic
        // to <body>, outside this component, where nothing ever removes it.
        if (!(await mermaid.parse(code, { suppressErrors: true }))) throw new Error('syntax')
        const { svg } = await mermaid.render(id, code)
        if (live) setSvg(svg)
      })
      .catch(() => {
        document.getElementById('d' + id)?.remove()
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [code, id])

  if (failed) return <CodeBlock code={code} lang="mermaid" />
  if (!svg) return <div className="mermaid pending" aria-busy="true" />
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
