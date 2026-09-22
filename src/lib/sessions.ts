/** Values derived from a session record.
 *
 * Small, but they were computed in four places with three different answers,
 * which is the kind of drift that makes two screens disagree about the same
 * session. Keep derivations here rather than inline in a component.
 */

import type { Command, ContextItem, Session } from '../types'

/** How many commands failed.
 *
 *  `failed_count` is precomputed by AgentProbe because the list query does not
 *  carry commands - one real session has 141 of them. Older records predate the
 *  field, so the commands are counted when it is missing and they happen to be
 *  loaded.
 *
 *  Catchup used `failed_count ?? 0` and so reported zero failures for any
 *  pre-field session it had already expanded; the table and the detail panel
 *  used the fallback and reported the real number. Same session, two answers. */
export function failedCount(session: Pick<Session, 'failed_count' | 'commands'>): number {
  return session.failed_count ?? (session.commands ?? []).filter(isFailed).length
}

/** A command's outcome. `null` means the result was never seen in the
 *  transcript, which is not the same as success and must not render as a tick. */
export type CommandState = 'ok' | 'failed' | 'unknown'

export function commandState(exitStatus: number | null | undefined): CommandState {
  if (exitStatus === 1) return 'failed'
  if (exitStatus === 0) return 'ok'
  return 'unknown'
}

export function isFailed(c: Pick<Command, 'exit_status'>): boolean {
  return c.exit_status === 1
}

/** Tally values across a list, skipping empties.
 *
 *  Used for facet counts, where a missing project or user must not become a
 *  bucket labelled "undefined". */
export function countBy<T>(xs: T[], key: (x: T) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of xs) {
    const k = key(x)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Subagent runs per parent session.
 *
 *  Sidechains are transcripts, not sessions: they must not appear in a list of
 *  sessions, but a row should still be able to say that one spawned eleven
 *  agents. Keyed by `parent_session_id`. */
export function subagentCounts(sessions: Session[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of sessions) {
    if (!s.is_sidechain) continue
    if (s.parent_session_id) out[s.parent_session_id] = (out[s.parent_session_id] ?? 0) + 1
  }
  return out
}

/** Merge per-day link lists into one, most-mentioned first.
 *
 *  Deduped by `doc_id`: a link that appears on four days is one link, not
 *  four. */
export function mergeContext(groups: { context: ContextItem[] }[]): ContextItem[] {
  const byId = new Map<string, ContextItem>()
  for (const g of groups) for (const c of g.context) if (!byId.has(c.doc_id)) byId.set(c.doc_id, c)
  return [...byId.values()].sort((a, b) => b.mention_count - a.mention_count)
}
