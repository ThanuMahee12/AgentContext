import { Fragment, type ReactNode } from 'react'

import { Figure, classify } from './Media'

/** Render markdown as React elements.
 *
 *  Deliberately not a markdown-to-HTML library plus dangerouslySetInnerHTML.
 *  The content here is our own and trusted, but returning elements means the
 *  question never arises, and it keeps the dependency out of a bundle that
 *  already carries the Firebase SDK.
 *
 *  Supports what this content actually uses: headings, paragraphs, fenced and
 *  inline code, bullet and numbered lists, tables, blockquotes, rules, links,
 *  bold and italic. Anything unrecognised renders as its literal text rather
 *  than disappearing.
 *
 *  Media is block-level: a line holding only an image, a video, or a bare URL
 *  on an allowlisted embed host becomes a figure. Inline `![]()` inside a
 *  sentence stays inline, because that is what the author meant by putting it
 *  there.
 */
export default function Markdown({ source }: { source: string }) {
  return <div className="md">{renderBlocks(source)}</div>
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    // fenced code
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) body.push(lines[i++])
      i++ // closing fence
      out.push(
        <pre className="md-code" key={key++} data-lang={lang || undefined}>
          <code>{body.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // a line holding only an image or video: ![alt](url)
    const media = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (media) {
      out.push(<Figure key={key++} url={media[2]} alt={media[1]} />)
      i++
      continue
    }

    // a bare URL alone on a line, if it is something we can embed or show
    const bare = line.trim()
    if (/^https:\/\/\S+$/.test(bare) && classify(bare) !== 'link') {
      out.push(<Figure key={key++} url={bare} alt="" />)
      i++
      continue
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const depth = Math.min(h[1].length, 6)
      const Tag = (`h${Math.min(depth + 1, 6)}`) as 'h2'
      out.push(<Tag key={key++} id={slug(h[2])}>{inline(h[2])}</Tag>)
      i++
      continue
    }

    // horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { out.push(<hr key={key++} />); i++; continue }

    // table: a header row followed by a delimiter row
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]))
      out.push(
        <div className="md-tablewrap" key={key++}>
          <table>
            <thead><tr>{head.map((c, n) => <th key={n}>{inline(c)}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={n}>{r.map((c, m) => <td key={m}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // blockquote
    if (line.trimStart().startsWith('>')) {
      const body: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        body.push(lines[i++].replace(/^\s*>\s?/, ''))
      }
      out.push(<blockquote key={key++}>{renderBlocks(body.join('\n'))}</blockquote>)
      continue
    }

    // lists
    const bullet = /^\s*[-*+]\s+/
    const number = /^\s*\d+[.)]\s+/
    if (bullet.test(line) || number.test(line)) {
      const ordered = number.test(line)
      const re = ordered ? number : bullet
      const items: string[] = []
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '')
        // continuation lines belong to the item above
        while (i < lines.length && lines[i].trim() && !re.test(lines[i]) &&
               !/^(#{1,6}\s|```|>|\s*([-*_])\2{2,})/.test(lines[i])) {
          item += ' ' + lines[i++].trim()
        }
        items.push(item)
      }
      const List = ordered ? 'ol' : 'ul'
      out.push(<List key={key++}>{items.map((t, n) => <li key={n}>{inline(t)}</li>)}</List>)
      continue
    }

    // paragraph
    const para: string[] = []
    while (i < lines.length && lines[i].trim() &&
           !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      para.push(lines[i++])
    }
    out.push(<p key={key++}>{inline(para.join(' '))}</p>)
  }

  return out
}

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Inline spans: code, links, bold, italic. Code is matched first so markup
 *  inside a code span is left alone. */
function inline(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /(`[^`]+`)|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(https?:\/\/[^\s<>()]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0

  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('`')) {
      parts.push(<code key={key++}>{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('![')) {
      const img = tok.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)!
      parts.push(<img className="inline-img" key={key++} src={img[2]} alt={img[1]} loading="lazy" />)
    } else if (tok.startsWith('[')) {
      const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      parts.push(<a key={key++} href={link[2]} target="_blank" rel="noreferrer noopener">{link[1]}</a>)
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*') || tok.startsWith('_')) {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    } else {
      parts.push(<a key={key++} href={tok} target="_blank" rel="noreferrer noopener">{tok}</a>)
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <Fragment>{parts}</Fragment>
}
