import type { ColumnDef } from '@tanstack/react-table'
import {
  createColumnHelper,
  createSortedRowModel,
  columnVisibilityFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

import { formatStamp } from '../lib/format'
import { failedCount } from '../lib/sessions'
import type { Session } from '../types'

/**
 * The session archive as a sortable table.
 *
 * This replaced a day-grouped card list. Cards were readable one at a time but
 * answered no question across sessions - "which project fails most", "where did
 * the 2 MB transcripts come from" - because nothing could be ordered by a
 * column. The table is for scanning; the detail panel is still where a single
 * session gets read.
 *
 * TanStack Table v9, whose API differs from every v8 example in circulation:
 * features are registered explicitly through `tableFeatures()` rather than
 * implied, row models are supplied as slots on that same object, and there is
 * no `getCoreRowModel()` to pass. Registering only sorting and column
 * visibility keeps filtering, grouping, pagination and the rest out of the
 * bundle - it is the whole point of the v9 rewrite.
 */
const features = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  // Registered by name so unused comparators tree-shake. `basic` is `<`/`>`,
  // which is exactly right for the ISO-8601 timestamps and the numeric columns;
  // ISO strings sort chronologically under a plain string compare, so the
  // heavier `datetime` comparator would only cost a Date parse per row.
  sortFns: { basic: sortFn_basic, alphanumeric: sortFn_alphanumeric },
})

/** One row, fully precomputed.
 *
 *  Derived values (failures, subagent counts, KB) are resolved before the table
 *  sees them rather than inside an accessor, so sorting compares the same
 *  numbers the cells display. An accessor that recomputes is how a column ends
 *  up sorted by something other than what it shows. */
export interface SessionRow {
  session: Session
  started: string
  project: string
  preview: string
  provider: string
  user: string
  messages: number
  commands: number
  failed: number
  files: number
  agents: number
  kb: number
}

export function toRows(sessions: Session[], agentCounts: Record<string, number>): SessionRow[] {
  return sessions.map((s) => ({
    session: s,
    started: s.started,
    project: s.project,
    preview: s.preview ?? '',
    provider: s.provider,
    user: s.os_user,
    messages: s.message_count,
    commands: s.command_count,
    failed: failedCount(s),
    files: s.file_count,
    agents: agentCounts[s.session_id] ?? 0,
    kb: Math.round(s.transcript_bytes / 1024),
  }))
}

const col = createColumnHelper<typeof features, SessionRow>()

/** Annotated rather than inferred, and `any` for the cell-value parameter on
 *  purpose. Each accessor infers its own TValue - string here, number there -
 *  so the array's inferred type is a union that TypeScript will not accept as
 *  the single ColumnDef[] the table wants. Widening the value type is the
 *  narrowest fix available: the accessors themselves stay fully checked
 *  against SessionRow, which is the part worth keeping. */
const columns: ColumnDef<typeof features, SessionRow, any>[] = [
  col.accessor('started', {
    header: 'Started',
    sortFn: 'basic',
    cell: (c) => (
      <span className="whitespace-nowrap tabular-nums">{formatStamp(c.getValue())}</span>
    ),
  }),
  col.accessor('project', { header: 'Project', sortFn: 'alphanumeric' }),
  col.accessor('preview', {
    header: 'Preview',
    sortFn: 'alphanumeric',
    cell: (c) => (
      // The only column allowed to take the slack, and the only one that may
      // ellipsize: a table that wraps preview text stops being scannable.
      <span className="block max-w-[38ch] truncate text-text-3" title={c.getValue()}>
        {c.getValue()}
      </span>
    ),
  }),
  col.accessor('provider', { header: 'Provider', sortFn: 'alphanumeric' }),
  col.accessor('user', { header: 'User', sortFn: 'alphanumeric' }),
  col.accessor('messages', { header: 'Msgs', sortFn: 'basic', meta: { numeric: true } }),
  col.accessor('commands', { header: 'Cmds', sortFn: 'basic', meta: { numeric: true } }),
  col.accessor('failed', {
    header: 'Failed',
    sortFn: 'basic',
    meta: { numeric: true },
    // Zero failures is the normal case and does not need drawing attention to;
    // a column of grey zeroes would bury the rows that do matter.
    cell: (c) =>
      c.getValue() > 0 ? (
        <b className="text-err">{c.getValue()}</b>
      ) : (
        <span className="text-text-3">0</span>
      ),
  }),
  col.accessor('agents', {
    header: 'Agents',
    sortFn: 'basic',
    meta: { numeric: true },
    cell: (c) => (c.getValue() > 0 ? c.getValue() : <span className="text-text-3">—</span>),
  }),
  col.accessor('files', { header: 'Files', sortFn: 'basic', meta: { numeric: true } }),
  col.accessor('kb', {
    header: 'Size',
    sortFn: 'basic',
    meta: { numeric: true },
    cell: (c) => <span className="whitespace-nowrap">{c.getValue().toLocaleString()} KB</span>,
  }),
]

export default function SessionTable({
  rows,
  selectedId,
  onOpen,
}: {
  rows: SessionRow[]
  selectedId?: string
  onOpen: (s: Session) => void
}) {
  const table = useTable({
    features,
    columns,
    data: rows,
    // Newest first is what the archive was always ordered by, so the table
    // opens looking like the list it replaced.
    initialState: { sorting: [{ id: 'started', desc: true }] },
  })

  return (
    // Tailwind's preflight is deliberately not imported by this project, so a
    // <table> still carries the browser's default `border-spacing` and
    // `border-collapse: separate`. Both are set here rather than assumed.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border-spacing-0 text-left text-[13px]">
        <thead>
          <tr className="border-b border-line">
            {table.getHeaderGroups()[0].headers.map((header) => {
              const sorted = header.column.getIsSorted()
              const numeric = (header.column.columnDef.meta as { numeric?: boolean } | undefined)
                ?.numeric
              return (
                <th
                  key={header.id}
                  scope="col"
                  // aria-sort is what tells a screen reader the table is
                  // ordered and by which column; the arrow alone is invisible
                  // to one.
                  aria-sort={
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                  }
                  className={'p-0 font-medium' + (numeric ? ' text-right' : '')}
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={
                      'w-full cursor-pointer bg-transparent px-2 py-2 text-[11px] tracking-wide uppercase ' +
                      'text-text-3 hover:text-text ' +
                      (numeric ? 'text-right' : 'text-left') +
                      (sorted ? ' text-text' : '')
                    }
                  >
                    <table.FlexRender header={header} />
                    <span aria-hidden className="ml-1 inline-block w-2 opacity-70">
                      {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => {
            const s = row.original.session
            const isSelected = s.session_id === selectedId
            return (
              <tr
                key={row.id}
                onClick={() => onOpen(s)}
                // A table row is not focusable or activatable on its own. Rather
                // than nest a button in every cell, the row takes the button
                // role and both activation keys, which is what makes the archive
                // usable without a mouse.
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(s)
                  }
                }}
                className={
                  'cursor-pointer border-b border-line/60 hover:bg-raised ' +
                  (isSelected ? 'bg-raised' : '')
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const numeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)
                    ?.numeric
                  return (
                    <td
                      key={cell.id}
                      className={
                        'px-2 py-1.5 align-middle' + (numeric ? ' text-right tabular-nums' : '')
                      }
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
