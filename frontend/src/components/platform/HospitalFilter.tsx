import { MenuItem, TextField } from '@mui/material'
import type { Hospital } from '../../types/tenant'

/**
 * The one control the two directories share. It reads and writes the URL, so a count on
 * the overview can link straight to "the staff at this hospital" and the screen arrives
 * already filtered.
 */
export default function HospitalFilter({ hospitals, value, onChange }: {
  hospitals: Hospital[]
  value: string
  onChange: (hospitalId: string) => void
}) {
  return (
    <TextField select size="small" label="Hospital" value={value} sx={{ minWidth: 260 }}
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="">All hospitals</MenuItem>
      {hospitals.map((hospital) => (
        <MenuItem key={hospital.id} value={hospital.id}>{hospital.name}</MenuItem>
      ))}
    </TextField>
  )
}
