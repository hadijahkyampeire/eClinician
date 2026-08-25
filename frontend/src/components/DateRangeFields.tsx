import { TextField } from '@mui/material'

/**
 * The From/To pair behind every look-back window.
 *
 * These were bare `<input type="date">` — the only unstyled fields left in the app, sat
 * next to Material ones everywhere else. They are the same control now, so a date field
 * looks like a date field wherever you meet it. The label is pinned open because a date
 * input is never visually empty: the browser always shows its own placeholder.
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
  const clean = (value: string) => value || undefined

  return (
    <div className="date-range">
      <TextField type="date" label="From" size={size} value={from ?? ''}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to || undefined } }}
        onChange={event => onChange(clean(event.target.value), to)} />
      <TextField type="date" label="To" size={size} value={to ?? ''}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from || undefined } }}
        onChange={event => onChange(from, clean(event.target.value))} />
    </div>
  )
}
