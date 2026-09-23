import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
// After the library's stylesheet, never before: same specificity, last wins.
import '../styles/datepicker.css'

import { parseDayKey, toDayKey } from '../lib/format'

/**
 * The archive filtered to a span of days.
 *
 * The table could always sort by date; it could never answer "just last week".
 * This is the one facet whose values are continuous rather than a list, which
 * is why it is a picker and not another dropdown.
 *
 * `toDayKey` and `parseDayKey`, never `toISOString().slice(0, 10)`: the latter
 * converts to UTC first, so an evening west of Greenwich picks the wrong day.
 * The picker hands back local Dates and the filter compares YYYY-MM-DD keys,
 * so the conversion has to be local at both ends.
 */
export default function DateRange({
  from,
  to,
  onChange,
}: {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}) {
  const start = from ? parseDayKey(from) : null
  const end = to ? parseDayKey(to) : null

  return (
    <div className="flex items-center gap-2">
      <DatePicker
        selectsRange
        startDate={start ?? undefined}
        endDate={end ?? undefined}
        onChange={([a, b]) =>
          onChange({ from: a ? toDayKey(a) : undefined, to: b ? toDayKey(b) : undefined })
        }
        maxDate={new Date()}
        dateFormat="d MMM"
        placeholderText="Any date"
        // The archive is append-only and read backwards, so a range is almost
        // always recent; opening on the current month saves a click.
        showPopperArrow={false}
        className="h-8 w-[150px] cursor-pointer rounded-s border border-field-line bg-surface px-2.5 text-[12.5px] text-text outline-none placeholder:text-text-muted focus:border-hue"
        aria-label="Filter by date range"
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange({ from: undefined, to: undefined })}
          className="cursor-pointer text-[12.5px] font-medium text-hue-lit hover:text-text"
        >
          Clear dates
        </button>
      )}
    </div>
  )
}
