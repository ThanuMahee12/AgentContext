import { useState } from 'react'
import type { Session } from '../types'

type Tab = 'commands' | 'files' | 'meta'

export default function SessionDetail({
  session,
  onClose,
}: {
  session: Session
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('commands')

  const failed = session.commands.filter((c) => c.exit_status === 1).length

  return (
    <aside className="detail">
      <header>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2>{session.project}</h2>
            <div className="sub">
              {session.session_id} · {session.cwd}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close detail">
            Close
          </button>
        </div>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'commands'} onClick={() => setTab('commands')}>
            Commands <span style={{ opacity: 0.6 }}>{session.command_count}</span>
          </button>
          <button role="tab" aria-selected={tab === 'files'} onClick={() => setTab('files')}>
            Files <span style={{ opacity: 0.6 }}>{session.file_count}</span>
          </button>
          <button role="tab" aria-selected={tab === 'meta'} onClick={() => setTab('meta')}>
            Details
          </button>
        </div>
      </header>

      <div className="pane">
        {tab === 'commands' &&
          (session.commands.length === 0 ? (
            <p className="empty">No commands ran in this session.</p>
          ) : (
            session.commands.map((c, i) => (
              <div className="cmd" key={c.tool_id || i}>
                <span
                  className={
                    'mark ' + (c.exit_status === 1 ? 'err' : c.exit_status === 0 ? 'ok' : '')
                  }
                  title={
                    c.exit_status === 1
                      ? 'returned an error'
                      : c.exit_status === 0
                        ? 'completed'
                        : 'result not recorded'
                  }
                >
                  {c.exit_status === 1 ? '✗' : c.exit_status === 0 ? '✓' : '·'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <code>{c.command}</code>
                  {c.description && <div className="desc">{c.description}</div>}
                </div>
              </div>
            ))
          ))}

        {tab === 'files' &&
          (session.files.length === 0 ? (
            <p className="empty">No files were touched.</p>
          ) : (
            session.files.map((f, i) => (
              <div className="filerow" key={i}>
                <span className={'act ' + f.action}>{f.action}</span>
                <span className="p">{f.path}</span>
              </div>
            ))
          ))}

        {tab === 'meta' && (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px' }}>
            {(
              [
                ['Provider', session.provider],
                ['Agent version', session.agent_version || '—'],
                ['Host', session.host],
                ['OS user', session.os_user],
                ['Git branch', session.git_branch || '—'],
                ['Started', session.started],
                ['Ended', session.ended],
                ['Messages', String(session.message_count)],
                ['Commands', `${session.command_count}${failed ? ` (${failed} failed)` : ''}`],
                ['Transcript', `${(session.transcript_bytes / 1024).toFixed(0)} KB · ${session.transcript_chunks} chunk(s)`],
                ['Checksum', session.transcript_sha256.slice(0, 16) + '…'],
              ] as const
            ).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--text-3)', fontSize: 12 }}>{k}</dt>
                <dd style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, wordBreak: 'break-all' }}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </aside>
  )
}
