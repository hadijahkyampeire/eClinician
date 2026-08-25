import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Button, Checkbox, FormControlLabel, IconButton, TextField, Tooltip } from '@mui/material'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import type { AvailabilityShift, Weekday } from '../../types/availability'
import { SHIFTS } from './days'

// "08:00" is not a date, so dayjs needs telling how to read it.
dayjs.extend(customParseFormat)

const hhmm = (value: string) => value.slice(0, 5)

/**
 * One day of the rota, with however many shifts are on it.
 *
 * A day used to hold exactly one shift, because the form assumed one and saving replaced
 * the whole rota with what the form held — so a clinician working a morning and an evening
 * lost the second one the moment they opened this page.
 */
export default function AvailabilityDay({ day, shifts, onChange }: {
  day: { value: Weekday; label: string }
  shifts: AvailabilityShift[]
  onChange: (shifts: AvailabilityShift[]) => void
}) {
  const working = shifts.length > 0

  function toggleDay(on: boolean) {
    onChange(on ? SHIFTS.map(shift => ({ ...shift, dayOfWeek: day.value, room: '' })) : [])
  }

  function add() {
    const taken = new Set(shifts.map(shift => hhmm(shift.startTime)))
    const next = SHIFTS.find(shift => !taken.has(shift.startTime)) ?? SHIFTS[0]
    onChange([...shifts, { ...next, dayOfWeek: day.value, room: shifts[0]?.room ?? '' }])
  }

  const edit = (index: number, field: keyof AvailabilityShift, value: string) =>
    onChange(shifts.map((shift, at) => at === index ? { ...shift, [field]: value } : shift))

  return (
    <div className="availability-day">
      <div className="availability-day-head">
        <FormControlLabel label={day.label}
          control={<Checkbox size="small" checked={working}
            onChange={event => toggleDay(event.target.checked)} />} />
        {working && (
          <Button size="small" startIcon={<AddIcon />} onClick={add}>Add shift</Button>
        )}
      </div>

      {working
        ? shifts
            .slice()
            .sort((a, b) => hhmm(a.startTime).localeCompare(hhmm(b.startTime)))
            .map((shift) => {
              const index = shifts.indexOf(shift)
              return (
                <div className="availability-shift" key={`${day.value}-${shift.startTime}`}>
                  <TimePicker label="From" value={dayjs(hhmm(shift.startTime), 'HH:mm')}
                    slotProps={{ textField: { size: 'small' } }}
                    onChange={value => edit(index, 'startTime',
                      value && value.isValid() ? value.format('HH:mm') : '')} />
                  <TimePicker label="To" value={dayjs(hhmm(shift.endTime), 'HH:mm')}
                    slotProps={{ textField: { size: 'small',
                      error: hhmm(shift.endTime) <= hhmm(shift.startTime) } }}
                    onChange={value => edit(index, 'endTime',
                      value && value.isValid() ? value.format('HH:mm') : '')} />
                  <TextField size="small" label="Consultation room" value={shift.room}
                    error={!shift.room.trim()}
                    onChange={event => edit(index, 'room', event.target.value)} />
                  <Tooltip title="Remove this shift">
                    <IconButton size="small" aria-label={`Remove ${hhmm(shift.startTime)} shift`}
                      onClick={() => onChange(shifts.filter((_, at) => at !== index))}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              )
            })
        : <p className="availability-off">Not available</p>}
    </div>
  )
}
