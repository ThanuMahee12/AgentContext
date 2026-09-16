/** Mirrors the normalized record AgentProbe writes. Keep in sync with
 *  agentprobe/schema.py — this is the contract between the two repos. */

export type Provider = 'claude' | 'antigravity' | 'gemini' | 'copilot' | 'cursor'

export interface Command {
  ts: string
  command: string
  description: string
  tool_id: string
  /** 0 ok, 1 the tool returned an error, null when the result was never seen */
  exit_status: number | null
}

export interface FileTouch {
  ts: string
  path: string
  action: 'read' | 'write' | 'edit'
}

export interface Session {
  schema_version: number
  provider: Provider
  session_id: string
  /** The session this transcript belongs to. Equals session_id for a real
   *  session; for a subagent run it points at the parent. */
  parent_session_id: string
  /** True when the transcript is a subagent run rather than a session. */
  is_sidechain: boolean
  date: string
  started: string
  ended: string
  cwd: string
  project: string
  user_email: string
  os_user: string
  host: string
  git_branch: string
  agent_version: string
  message_count: number
  command_count: number
  /** Precomputed by AgentProbe: the list query does not carry commands. */
  failed_count: number
  file_count: number
  preview: string
  transcript_chunks: number
  transcript_bytes: number
  transcript_sha256: string
  commands: Command[]
  files: FileTouch[]
}

export interface ContextItem {
  doc_id: string
  url: string
  source: string
  type: string
  external_id: string
  title: string
  body: string
  tags: string[]
  keywords: string[]
  date: string
  project: string
  user_email: string
  provider: string
  sessions: string[]
  first_seen: string
  last_seen: string
  mention_count: number
  pinned: boolean
}

/** One calendar day of activity — what the timeline renders. */
export interface Day {
  date: string
  sessions: Session[]
  context: ContextItem[]
}

export interface Filters {
  projects: string[]
  users: string[]
  providers: string[]
  query: string
}

/** A curated page published for public viewing.
 *
 *  Deliberately a COPY, not a reference to a session. Publishing writes a new
 *  document into `public/`; nothing in the private tree is ever made readable.
 *  A mistake in the rules therefore cannot expose the archive, because no rule
 *  covers it.
 */
export interface PublishedPage {
  slug: string
  title: string
  summary: string
  body: string
  tags: string[]
  published_at: string
  updated_at: string
  author: string
}
