import { useAppDispatch, useAppSelector } from '../../store'
import { toggleTag } from '../../store/uiSlice'
import Markdown from '../../components/Markdown'
import { matches, TagRow, Empty } from './shared'

/** Topics worked through with other people. Each carries a link out to where
 *  the conversation actually happened, and any comments recorded since. */
export default function Discussions() {
  const dispatch = useAppDispatch()
  const { query, tag } = useAppSelector((s) => s.ui)
  const items = useAppSelector((st) => st.content.discussions).filter((d) =>
    matches(query, tag, [d.title, d.summary, d.body ?? '', ...d.tags], d.tags),
  )

  return (
    <div className="page reveal" data-section="discussions">
      <h1 className="pagetitle">Discussions</h1>
      <p className="standfirst">Topics worked through with other people.</p>

      {items.length === 0 ? (
        <Empty query={query} tag={tag} />
      ) : (
        <div className="stack">
          {items.map((d) => (
            <article className="entry" id={d.id} key={d.id}>
              <header>
                <h2>{d.title}</h2>
                {d.date && <time dateTime={d.date}>{d.date}</time>}
              </header>

              {d.summary && <p className="lede">{d.summary}</p>}
              {d.body && <Markdown source={d.body} />}

              <TagRow tags={d.tags} active={tag} onPick={(t) => dispatch(toggleTag(t))} />

              {d.url && (
                <p className="out">
                  <a href={d.url} target="_blank" rel="noreferrer noopener">
                    Read the full thread
                  </a>
                </p>
              )}

              {d.comments.length > 0 && (
                <ol className="thread">
                  {d.comments.map((c, i) => (
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
