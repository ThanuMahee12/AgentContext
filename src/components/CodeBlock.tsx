import { useState } from 'react'

/** A fenced block with its language and a copy control.
 *
 *  Most of this content is shell: 30 of the 91 fenced blocks are bash. Reading
 *  a command and retyping it is where transcription errors come from, so the
 *  block exists to be taken, not just looked at.
 */
export default function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Say so rather than showing a success that did not
      // happen - the text is selectable either way.
      setState('failed')
    }
    setTimeout(() => setState('idle'), 1800)
  }

  const lines = code.split('\n').length

  return (
    <div className="codeblock">
      <div className="bar">
        {lang && <span className="lang">{lang}</span>}
        <span className="lines">
          {lines} line{lines === 1 ? '' : 's'}
        </span>
        <button className="copy" onClick={copy} data-state={state}>
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}
        </button>
      </div>
      <pre className="md-code" data-lang={lang || undefined}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
