/** Every server read in the app, as hooks.
 *
 * CLAUDE.md is explicit that server state goes through TanStack Query and never
 * through `useEffect` + `useState`, but three screens still did it by hand:
 * Admin, ContentAdmin and Published each carried their own
 * loading/error/data triple, their own fetch-on-mount effect, and their own
 * spelling of "what went wrong". Catchup went further and re-implemented
 * Admin's archive read inside its own `queryFn`.
 *
 * Collecting them here means a screen asks for data and gets caching,
 * deduplication and a shared error shape for free - and the same read from two
 * screens is one request, which is the whole reason the query client exists.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'

import { db } from '../firebase'
import { getPublished } from './published'
import { keys } from './queryClient'
import { getSource } from './source'
import type { ContextItem, PublishedPage, Session } from '../types'

const source = getSource()

/** Firebase errors carry a machine code and a long message; the code is what
 *  identifies the fault, so it wins when present. */
export function describeError(err: unknown): string {
  const e = err as { code?: string; message?: string }
  return e?.code ? e.code : (e?.message ?? String(err)).slice(0, 120)
}

// ---------------------------------------------------------------------------
// The private archive

export interface Archive {
  sessions: Session[]
  context: ContextItem[]
  /** Human-readable notes about the halves that failed, if any. */
  problems: string[]
}

/**
 * Sessions and extracted links together.
 *
 * Settled, not `all`. A rejection in either half used to empty both, which
 * rendered as "No sessions captured yet" - indistinguishable from an empty
 * database. A permission error and having no data must not look the same, so
 * this resolves with whatever succeeded and reports the rest in `problems`.
 *
 * That also means the query itself rarely rejects, so callers read `problems`
 * rather than `isError`.
 */
export function useArchive({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.archive,
    enabled,
    queryFn: async (): Promise<Archive> => {
      const [s, c] = await Promise.allSettled([source.sessions(), source.context()])
      const problems: string[] = []
      if (s.status === 'rejected') problems.push(`sessions: ${describeError(s.reason)}`)
      if (c.status === 'rejected') problems.push(`links: ${describeError(c.reason)}`)
      return {
        sessions: s.status === 'fulfilled' ? s.value : [],
        context: c.status === 'fulfilled' ? c.value : [],
        problems,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Public per-day counts

export interface Totals {
  date: string
  sessions: number
  messages: number
  commands: number
  files: number
  failed: number
}

/** Counts per day, and nothing else. This is the one private-adjacent thing a
 *  signed-out visitor is allowed to see, so it is read from its own public
 *  collection rather than derived from the archive. */
export function useDailyTotals() {
  return useQuery({
    queryKey: keys.daily,
    queryFn: async (): Promise<Record<string, Totals>> => {
      const snap = await getDocs(collection(db, 'daily'))
      const out: Record<string, Totals> = {}
      for (const d of snap.docs) {
        const v = d.data() as Partial<Totals>
        out[d.id] = {
          date: d.id,
          sessions: Number(v.sessions ?? 0),
          messages: Number(v.messages ?? 0),
          commands: Number(v.commands ?? 0),
          files: Number(v.files ?? 0),
          failed: Number(v.failed ?? 0),
        }
      }
      return out
    },
  })
}

// ---------------------------------------------------------------------------
// Documents, and promoting one

export const PUBLISHED = 'published'
export const DRAFT = 'draft'

export interface DocRow {
  id: string
  title: string
  section: string
  date: string
  status: string
  visibility: string
  agent: string
  description: string
}

/** Every document, drafts included. Requires being signed in: the rule on
 *  `docs` allows an unpublished document only to `canView()`. */
export function useDocs() {
  return useQuery({
    queryKey: keys.docs,
    queryFn: async (): Promise<DocRow[]> => {
      const snap = await getDocs(collection(db, 'docs'))
      const rows = snap.docs.map((d) => {
        const v = d.data() as Partial<DocRow>
        return {
          id: d.id,
          title: v.title || d.id,
          section: v.section || '',
          date: v.date || '',
          status: v.status || '',
          // Absent means draft. The publisher and the security rule both treat
          // it that way; showing it as anything else here would mislead.
          visibility: v.visibility || DRAFT,
          agent: v.agent || '',
          description: v.description || '',
        }
      })
      rows.sort(
        (a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title),
      )
      return rows
    },
  })
}

/** Promote a document to the public page, or pull it back.
 *
 *  Writes the cache directly on success instead of invalidating: the new value
 *  is known, and a refetch here would re-read every document to learn one
 *  field. The row stays put while it updates, which matters on a list the
 *  reader is working down. */
export function useSetVisibility() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      await updateDoc(doc(db, 'docs', id), { visibility })
      return { id, visibility }
    },
    onSuccess: ({ id, visibility }) => {
      client.setQueryData<DocRow[]>(keys.docs, (cur) =>
        cur?.map((d) => (d.id === id ? { ...d, visibility } : d)),
      )
    },
  })
}

// ---------------------------------------------------------------------------
// A single published page

/** `null` is a real, cacheable answer here - "this slug is not published" is
 *  what the Not-found view renders, not an error state. */
export function usePublishedPage(slug: string) {
  return useQuery({
    queryKey: keys.published(slug),
    enabled: !!slug,
    queryFn: (): Promise<PublishedPage | null> => getPublished(slug),
  })
}
