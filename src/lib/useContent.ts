import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../firebase'
import { keys } from './queryClient'
import { kinds, type Doc, type KindId } from './sections'

export type Sections = Record<KindId, Doc[]>

function empty(): Sections {
  return Object.fromEntries(kinds.map((k) => [k.id, []])) as unknown as Sections
}

const EMPTY = empty()

/**
 * Drop the dated prefix from a document's path.
 *
 * Dated kinds are filed under a UTC date - `ideas/2026/09/28/slug.md` - so a
 * document arrives with the path `2026/09/28/slug`. The section page builds its
 * folder tree from the segments, which rendered as a folder `2026` holding `09`
 * holding `28` holding the one document: three navigations to reach a page
 * that should sit at the section root. The date is already in `date`, where it
 * can be sorted and displayed; in the path it is filing, not structure.
 *
 * Only a LEADING run of all-numeric segments goes, so a document genuinely
 * filed under a folder - `agentprobe/parallelism` - still nests where its
 * author put it. A catchup's path is nothing but a date, so it falls back to
 * its id, which is that date written as one segment.
 */
const DATEISH = /^\d{2,4}$/

export function normalize(raw: Record<string, unknown>, kind: KindId, id: string): Doc {
  const path = String(raw.path ?? id)
  let segments = path.split('/').filter(Boolean)
  let i = 0
  while (i < segments.length && DATEISH.test(segments[i])) i++
  segments = segments.slice(i)
  if (!segments.length) segments = [id]

  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  return {
    ...(raw as object),
    id,
    kind,
    title: String(raw.title || id),
    date: String(raw.date ?? ''),
    body: String(raw.body ?? ''),
    path: segments.join('/'),
    segments,
    parent: segments.slice(0, -1).join('/'),
    depth: segments.length - 1,
    tags: list(raw.tags),
    headings: list(raw.headings),
    refs: list(raw.refs),
    backlinks: list(raw.backlinks),
    links: list(raw.links),
    diagrams: list(raw.diagrams),
  } as Doc
}

/**
 * Published documents, one query per kind.
 *
 * The filter is not an optimisation. `firestore.rules` allows an unpublished
 * document only to a signed-in admin, and a list query that does not constrain
 * on visibility is rejected outright rather than filtered - so a missing
 * `where` here fails loudly instead of leaking.
 *
 * A kind whose read fails is reported and left empty rather than failing the
 * site: one collection missing its rule must not blank eight others.
 */
export function useContent() {
  const q = useQuery({
    queryKey: keys.publicDocs,
    queryFn: async (): Promise<Sections> => {
      const results = await Promise.allSettled(
        kinds.map((k) =>
          getDocs(query(collection(db, k.collection), where('visibility', '==', 'published'))),
        ),
      )
      const out = empty()
      const failed: string[] = []

      results.forEach((r, n) => {
        const kind = kinds[n]
        if (r.status === 'rejected') {
          failed.push(`${kind.collection}: ${String(r.reason?.message ?? r.reason)}`)
          return
        }
        out[kind.id] = r.value.docs.map((d) => normalize(d.data(), kind.id, d.id))
      })
      if (failed.length === kinds.length) throw new Error(failed.join('\n'))
      if (failed.length) console.warn(`useContent: could not read\n  ${failed.join('\n  ')}`)

      for (const kind of kinds) {
        // Long-lived kinds are looked up by name; dated ones by recency.
        if (kind.id === 'topics' || kind.id === 'projects') {
          out[kind.id].sort((a, b) => a.title.localeCompare(b.title))
        } else {
          out[kind.id].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        }
      }
      return out
    },
  })
  // `ready` is the one a page must check before concluding a document does not
  // exist. Before the read settles `content` is EMPTY, and treating that as the
  // answer is what bounced a reloaded document URL back to its section root.
  return {
    content: q.data ?? EMPTY,
    ready: q.isSuccess || q.isError,
    isLoading: q.isPending,
    error: q.error,
  }
}

/** Tag counts across every published document. */
export function tagCounts(content: Sections): Array<{ tag: string; count: number }> {
  const n = new Map<string, number>()
  for (const list of Object.values(content)) {
    for (const d of list) {
      for (const t of d.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1)
    }
  }
  return [...n.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
