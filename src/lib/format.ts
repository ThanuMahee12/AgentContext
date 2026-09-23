/** Formatting, in one place.
 *
 * These were previously seven local helpers across six files: `formatDate` in
 * Published, `formatStamp` in SessionTable, `time` in Catchup, `countWords` in
 * Home and two more spellings of the same word count inside Tree and Section.
 * Scattering them is how two pages end up disagreeing about what a date looks
 * like, and it is exactly how the word counts drifted - see `countWords` below.
 *
 * Everything here takes the string shapes the data actually arrives in:
 * `started`/`published_at` are full ISO timestamps, `date` fields are
 * `YYYY-MM-DD`, and both can be absent or malformed in old records.
 */

/** Parse a `YYYY-MM-DD` key as a LOCAL date.
 *
 *  `new Date('2026-09-18')` is parsed as UTC and then displayed locally, which
 *  renders as the 17th for everyone west of Greenwich. Appending a time forces
 *  local interpretation, which is what a calendar square means. */
export function parseDayKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const d = new Date(key + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

/** A local `YYYY-MM-DD` key. The inverse of `parseDayKey`.
 *
 *  `toISOString().slice(0, 10)` is the obvious version and it is wrong for the
 *  same reason: it converts to UTC first, so an evening in New York files under
 *  tomorrow. */
export function toDayKey(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  )
}

function parse(iso: string): Date | null {
  if (!iso) return null
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseDayKey(iso) : new Date(iso)
  return d && !Number.isNaN(d.getTime()) ? d : null
}

/** `18 Sep 2026` — a date the reader is expected to remember. */
export function formatDate(iso: string): string {
  const d = parse(iso)
  return d
    ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : iso || ''
}

/** `Fri 18 Sep 2026` — a heading for a day's worth of activity. */
export function formatDayHeading(iso: string): string {
  const d = parse(iso)
  return d
    ? d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : iso || ''
}

/** `September 2026`. */
export function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** `14:05`. 24-hour on purpose: these are log timestamps, and am/pm doubles the
 *  width of a column that appears once per row. */
export function formatTime(iso: string): string {
  const d = parse(iso)
  return d
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''
}

/** `18 Sep 14:05` — date and time in one cell.
 *
 *  The archive spans months, so a bare time is ambiguous the moment a table is
 *  sorted by anything other than date. */
export function formatStamp(iso: string): string {
  const d = parse(iso)
  if (!d) return iso || '—'
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
  return `${date} ${formatTime(iso)}`
}

/** Words in a body of text.
 *
 *  There were three versions of this. Two filtered empty strings out and one
 *  guarded the empty case instead, because `''.trim().split(/\s+/)` returns
 *  `['']` — length 1 — and an empty document was being reported as one word by
 *  whichever version forgot. Guarding up front is the version that cannot be
 *  got wrong by a later edit. */
export function countWords(s: string | undefined | null): number {
  const t = (s ?? '').trim()
  return t ? t.split(/\s+/).length : 0
}

/** Reading time at 220 wpm, never rounded down to zero. */
export function readingMinutes(s: string | undefined | null): number {
  return Math.max(1, Math.round(countWords(s) / 220))
}

/** `1.2k` above a thousand, the plain number below it. */
export function formatCompact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/** Shorten to `n` characters, ellipsis included in the budget. */
export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
