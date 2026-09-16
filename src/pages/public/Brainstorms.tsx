import { content } from '../../content'
import { useAppDispatch, useAppSelector } from '../../store'
import { toggleTag } from '../../store/uiSlice'
import Markdown from '../../components/Markdown'
import { matches, TagRow, Empty } from './shared'

/** Ideas being worked out. Status is shown because an idea being implemented
 *  is a different thing from one still being argued with. */
export default function Brainstorms() {
  const dispatch = useAppDispatch()
  const { query, tag } = useAppSelector((s) => s.ui)
  const items = content.brainstorms.filter((b) =>
    matches(query, tag, [b.title, b.summary, ...b.tags], b.tags),
  )

  return (
    <div className="page reveal" data-section="brainstorms">
      <h1 className="pagetitle">Brainstorms</h1>
      <p className="standfirst">Ideas being worked out, with the thinking left in.</p>

      {items.length === 0 ? (
        <Empty query={query} tag={tag} />
      ) : (
        <div className="stack">
          {items.map((b) => (
            <article className="entry" id={b.id} key={b.id}>
              <header>
                <h2>{b.title}</h2>
                {b.date && <time dateTime={b.date}>{b.date}</time>}
                {b.status && <span className={'status ' + b.status.replace(/\s+/g, '-')}>{b.status}</span>}
              </header>

              {b.summary && <p className="lede">{b.summary}</p>}

              <TagRow tags={b.tags} active={tag} onPick={(t) => dispatch(toggleTag(t))} />

              {(b.gist || b.notion) && (
                <p className="out">
                  {b.gist && <a href={b.gist} target="_blank" rel="noreferrer noopener">Gist</a>}
                  {b.notion && <a href={b.notion} target="_blank" rel="noreferrer noopener">Notion</a>}
                </p>
              )}

              {b.comments.length > 0 && (
                <ol className="thread">
                  {b.comments.map((c, i) => (
                    <li key={i}>
                      <header>
                        {c.topic && <strong>{c.topic}</strong>}
                        {c.date && <time dateTime={c.date}>{c.date}</time>}
                      </header>
                      <Markdown source={c.content} />
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
