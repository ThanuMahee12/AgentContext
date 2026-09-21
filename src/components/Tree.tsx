import { Link } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../store'
import { toggleFolder } from '../store/uiSlice'

interface Node {
  name: string
  path: string
  children: Node[]
  docs: any[]
}

/** Build the folder tree from documents that carry a path. */
export function build(items: any[]): Node {
  const root: Node = { name: '', path: '', children: [], docs: [] }

  for (const item of items) {
    const segments: string[] = item.segments ?? [item.id]
    let node = root
    for (const name of segments.slice(0, -1)) {
      let next = node.children.find((c) => c.name === name)
      if (!next) {
        next = { name, path: node.path ? `${node.path}/${name}` : name, children: [], docs: [] }
        node.children.push(next)
      }
      node = next
    }
    node.docs.push(item)
  }

  const sort = (n: Node) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name))
    n.docs.sort((a, b) => a.title.localeCompare(b.title))
    n.children.forEach(sort)
  }
  sort(root)
  return root
}

const countIn = (n: Node): number => n.docs.length + n.children.reduce((t, c) => t + countIn(c), 0)

/**
 * A collapsible tree of the whole section.
 *
 *  Folders click-through used to mean one page per level; finding a command
 *  took three navigations and you never saw what else was there. The tree shows
 *  the whole shape at once and opens only what you ask for.
 *
 *  While a search is active every folder is forced open - a collapsed folder
 *  hiding a match looks exactly like no match.
 */
export default function Tree({
  items,
  basePath,
  searching,
}: {
  items: any[]
  basePath: string
  searching: boolean
}) {
  const root = build(items)
  return (
    <div className="tree">
      {root.children.map((n) => (
        <Branch key={n.path} node={n} basePath={basePath} depth={0} searching={searching} />
      ))}
      {root.docs.map((d) => (
        <Leaf key={d.path ?? d.id} doc={d} basePath={basePath} depth={0} />
      ))}
    </div>
  )
}

function Branch({
  node,
  basePath,
  depth,
  searching,
}: {
  node: Node
  basePath: string
  depth: number
  searching: boolean
}) {
  const dispatch = useAppDispatch()
  const expanded = useAppSelector((s) => s.ui.expanded)
  // Top level starts open: a command manager that opens closed shows nothing.
  const open = searching || expanded.includes(node.path) || (depth === 0 && expanded.length === 0)

  return (
    <div className="branch" style={{ '--depth': depth } as React.CSSProperties}>
      <button
        className={'twig' + (open ? ' open' : '')}
        onClick={() => dispatch(toggleFolder(node.path))}
        aria-expanded={open}
      >
        <span className="caret" aria-hidden />
        <span className="name">{node.name}</span>
        <span className="num">{countIn(node)}</span>
      </button>

      {open && (
        <div className="kids">
          {node.children.map((c) => (
            <Branch key={c.path} node={c} basePath={basePath} depth={depth + 1} searching={searching} />
          ))}
          {node.docs.map((d) => (
            <Leaf key={d.path ?? d.id} doc={d} basePath={basePath} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function Leaf({ doc, basePath, depth }: { doc: any; basePath: string; depth: number }) {
  const words = (doc.body ?? '').trim().split(/\s+/).filter(Boolean).length
  return (
    <Link
      className="leaf"
      to={`${basePath}/${doc.path ?? doc.id}`}
      style={{ '--depth': depth } as React.CSSProperties}
    >
      <span className="t">{doc.title}</span>
      {doc.description && <span className="d">{doc.description}</span>}
      <span className="mins">{Math.max(1, Math.round(words / 220))} min</span>
    </Link>
  )
}
