import { QueryClient } from '@tanstack/react-query'

/**
 * One client for the app.
 *
 * The archive is append-only and a session never changes once written, so the
 * defaults lean hard on caching: moving between the calendar, the dashboard and
 * a day should not re-read Firestore, which is both slow and metered.
 *
 * Retries are off for everything. A denied read is the expected outcome for a
 * signed-out visitor hitting a private collection, and retrying a 403 three
 * times only delays showing them the page they can actually see.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

/** Query keys in one place, so a cache entry is never invalidated by guesswork. */
export const keys = {
  /** Sessions and extracted links, read together - see `useArchive`. */
  archive: ['archive'] as const,
  sessions: ['sessions'] as const,
  context: ['context'] as const,
  daily: ['daily'] as const,
  docs: ['docs'] as const,
  published: (slug: string) => ['published', slug] as const,
}
