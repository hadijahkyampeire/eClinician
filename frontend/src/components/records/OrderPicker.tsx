import { useEffect, useRef, useState } from 'react'
import { Autocomplete, Button, IconButton, TextField, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { formatLines, parseLines, type OrderLine } from './orderLines'

export interface PickerOption {
  label: string
  group?: string
}

/**
 * Ordering by picking rather than typing.
 *
 * The list is a suggestion, never a fence: the box is free text, so anything the clinic
 * stocks that the catalogue has not heard of is still one keystroke away. That is the
 * point of `freeSolo` here — a prescription must never be blocked by a reference list.
 */
export default function OrderPicker({
  value, onChange, options, loading, disabled, label, addLabel, detailLabel, detailHint,
}: {
  /** The stored block: one order per line. */
  value: string
  onChange: (value: string) => void
  options: PickerOption[]
  loading?: boolean
  disabled?: boolean
  label: string
  addLabel: string
  /** Omitted for lab requests, which are just a name. */
  detailLabel?: string
  detailHint?: string
}) {
  /*
   * The rows live here, not in the parent's text.
   *
   * A line with no medicine on it is not an order, so it is dropped on the way out —
   * which means a freshly added, still-empty row would vanish the moment it was created
   * if the parent's string were the only state. So the rows are held locally and the
   * string is what leaves; the two are only re-synced when the encounter itself changes
   * underneath, which is how an existing record opens with its orders already in place.
   */
  const [lines, setLines] = useState<OrderLine[]>(() => parseLines(value))
  const sent = useRef(formatLines(parseLines(value)))

  useEffect(() => {
    if (value === sent.current) return
    setLines(parseLines(value))
    sent.current = value
  }, [value])

  function write(next: OrderLine[]) {
    setLines(next)
    const text = formatLines(next)
    sent.current = text
    onChange(text)
  }

  const edit = (index: number, patch: Partial<OrderLine>) =>
    write(lines.map((line, at) => at === index ? { ...line, ...patch } : line))

  return (
    <div className="order-picker form-field-wide">
      <div className="order-picker-head">
        <span className="order-picker-label">{label}</span>
        {!disabled && (
          <Button size="small" startIcon={<AddIcon />}
            onClick={() => write([...lines, { name: '', detail: '' }])}>{addLabel}</Button>
        )}
      </div>

      {lines.length === 0 && <p className="order-picker-empty">None ordered.</p>}

      {lines.map((line, index) => (
        <div className={`order-row${detailLabel ? '' : ' no-detail'}`} key={index}>
          <Autocomplete freeSolo size="small" disabled={disabled} loading={loading}
            options={options}
            groupBy={(option) => option.group ?? ''}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
            value={line.name}
            onInputChange={(_, text) => edit(index, { name: text })}
            renderInput={(params) => <TextField {...params} placeholder="Start typing…" />} />

          {detailLabel && (
            <TextField size="small" disabled={disabled} label={detailLabel}
              value={line.detail} placeholder={detailHint}
              onChange={(event) => edit(index, { detail: event.target.value })} />
          )}

          {!disabled && (
            <Tooltip title="Remove">
              <IconButton size="small" aria-label={`Remove ${line.name || 'order'}`}
                onClick={() => write(lines.filter((_, at) => at !== index))}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      ))}
    </div>
  )
}
