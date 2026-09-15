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
