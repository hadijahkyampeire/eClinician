import dayjs, { type Dayjs } from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

/** The API and the URL both speak "YYYY-MM-DD"; the picker speaks Dayjs. */
const toDay = (value: string | undefined) => value ? dayjs(value) : null
const toText = (value: Dayjs | null) =>
  value && value.isValid() ? value.format('YYYY-MM-DD') : undefined

/**
 * The From/To pair behind every look-back window.
 *
 * A Material picker rather than `<input type="date">`: the field could be restyled, but
 * the calendar that drops out of a native date input belongs to the browser and cannot
 * be — it arrived in Chrome blue in the middle of a green app. This one follows the theme
 * and looks the same in every browser.
 *
 * Either side may be left blank for an open-ended window, and each bounds the other so a
 * range cannot be set back to front.
 */
export default function DateRangeFields({ from, to, onChange, size = 'small' }: {
  from: string | undefined
  to: string | undefined
  onChange: (from: string | undefined, to: string | undefined) => void
  size?: 'small' | 'medium'
}) {
  return (
    <div className="date-range">
      <DatePicker label="From" value={toDay(from)} maxDate={toDay(to) ?? undefined}
        slotProps={{ textField: { size }, field: { clearable: true } }}
        onChange={(value) => onChange(toText(value), to)} />
      <DatePicker label="To" value={toDay(to)} minDate={toDay(from) ?? undefined}
        slotProps={{ textField: { size }, field: { clearable: true } }}
        onChange={(value) => onChange(from, toText(value))} />
    </div>
  )
}
