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
export function useContent() {
  const q = useQuery({
    queryKey: keys.docs,
    queryFn: async (): Promise<Sections> => {
      const snap = await getDocs(
        query(collection(db, 'docs'), where('visibility', '==', 'published')))
      const out: Sections = { brainstorms: [], discussions: [], kt: [], notes: [] }
      snap.docs.forEach((d) => {
        const raw = d.data() as Record<string, unknown>
        const section = raw.section as keyof Sections | undefined
        if (!section || !(section in out)) return
        // `comments` is optional in Firestore but the discussion views index it
        const v = { ...raw, comments: (raw.comments as unknown[]) ?? [] }
        ;(out[section] as unknown[]).push(v)
      })
      out.brainstorms.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      out.discussions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      out.kt.sort((a, b) => a.title.localeCompare(b.title))
      out.notes.sort((a, b) => a.title.localeCompare(b.title))
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
  return [...n.entries()].map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
