import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../firebase'
import { keys } from './queryClient'
import type { Brainstorm, Discussion, Doc } from './sections'

export type Sections = {
  brainstorms: Brainstorm[]
  discussions: Discussion[]
  kt: Doc[]
  notes: Doc[]
}

const EMPTY: Sections = { brainstorms: [], discussions: [], kt: [], notes: [] }

/**
 * What a document's `section` may say.
 *
 * Three names exist for the same thing and only one of them is the key this app
 * stores documents under:
 *
 *   key           authoring folder        URL
 *   brainstorms   content/brainstorm/     /brainstorm
 *   discussions   content/ideas/          /ideas
 *   notes         content/tech-commands/  /tech-commands
 *   kt            content/kt/             /kt
 *
 * A publisher naming the section after the folder or the URL gets it right
 * once out of four. Accepting all three spellings costs nothing and removes a
 * class of "the document published but never appeared" that has no visible
 * symptom - the old code dropped an unrecognised section with a bare `return`.
 */
const SECTION_OF: Record<string, keyof Sections> = {
  brainstorms: 'brainstorms',
  brainstorm: 'brainstorms',
  discussions: 'discussions',
  ideas: 'discussions',
  idea: 'discussions',
  notes: 'notes',
  'tech-commands': 'notes',
  kt: 'kt',
}

/**
 * Documents, from Firestore.
 *
 * There is no bundled copy any more. Content is authored outside this
 * repository and published by AgentProbe, so shipping a snapshot in the
 * JavaScript meant a second source of truth that went stale the moment anything
 * was published - and shipped every document to every visitor whether or not it
 * was meant to be public.
 *
 * The filter is not an optimisation. `firestore.rules` allows an unpublished
 * document only to a signed-in admin, and a list query that does not constrain
 * on visibility is rejected outright rather than filtered - so a missing
 * `where` here fails loudly instead of leaking.
 */
/**
 * Drop the dated prefix from a document's path.
 *
 * Documents are stored under a UTC-dated path - `content/ideas/2026/09/28/slug.md`
 * - so a document arrives with `segments: ["2026","09","28","slug"]`. The
 * section page builds its folder tree from those segments, which rendered as a
 * folder `2026` holding a folder `09` holding a folder `28` holding the one
 * document: three navigations to reach a page that should be sitting at the
 * section root. The date is already in `date`, where it can be sorted and
 * displayed; in the path it is filing, not structure.
 *
 * Only a LEADING run of all-numeric segments goes, and never the filename
 * itself, so a document genuinely filed under a folder - `agentprobe/parallelism`
 * - still nests where its author put it.
 */
const DATEISH = /^\d{2,4}$/

function undate(raw: Record<string, unknown>): Record<string, unknown> {
  const segments = (Array.isArray(raw.segments) ? raw.segments : []).map(String)
  let i = 0
  while (i < segments.length - 1 && DATEISH.test(segments[i])) i++
  if (i === 0) return raw

  const rest = segments.slice(i)
  return {
    ...raw,
    segments: rest,
    path: rest.join('/'),
    parent: rest.slice(0, -1).join('/'),
    depth: rest.length - 1,
    // `project` is derived by the publisher from the first segment, which for a
    // dated path is the year. A year is not a project.
    project: DATEISH.test(String(raw.project ?? '')) ? '' : raw.project,
  }
}

export function useContent() {
  const q = useQuery({
    queryKey: keys.docs,
    queryFn: async (): Promise<Sections> => {
      const snap = await getDocs(
        query(collection(db, 'docs'), where('visibility', '==', 'published')),
      )
      const out: Sections = { brainstorms: [], discussions: [], kt: [], notes: [] }
      const unplaced: string[] = []

      snap.docs.forEach((d) => {
        const raw = d.data() as Record<string, unknown>
        const section =
          SECTION_OF[
            String(raw.section ?? '')
              .trim()
              .toLowerCase()
          ]
        if (!section) {
          // A published document with a section nobody recognises used to
          // vanish here. Collect it instead, so the reason is findable.
          unplaced.push(`${d.id} (section: ${JSON.stringify(raw.section) ?? 'missing'})`)
          return
        }
        // `comments` is optional in Firestore but the discussion views index it
        const v = { ...undate(raw), comments: (raw.comments as unknown[]) ?? [] }
        ;(out[section] as unknown[]).push(v)
      })
      out.brainstorms.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      out.discussions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      out.kt.sort((a, b) => a.title.localeCompare(b.title))
      out.notes.sort((a, b) => a.title.localeCompare(b.title))

      if (unplaced.length) {
        // Not thrown: one mislabelled document must not blank the whole site.
        console.warn(
          `useContent: ${unplaced.length} published document(s) have a section this app does ` +
            `not recognise, so they are not shown. Expected one of ` +
            `${Object.keys(SECTION_OF).join(', ')}.\n  ` +
            unplaced.join('\n  '),
        )
      }

      return out
    },
  })
  return { content: q.data ?? EMPTY, isLoading: q.isLoading, error: q.error }
}

/** Tag counts across every published document. */
export function tagCounts(content: Sections): Array<{ tag: string; count: number }> {
  const n = new Map<string, number>()
  for (const list of Object.values(content)) {
    for (const d of list as Array<{ tags?: string[] }>) {
      for (const t of d.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1)
    }
  }
  return [...n.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
