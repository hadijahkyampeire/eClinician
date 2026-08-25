import { Button, MenuItem, TextField } from '@mui/material'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import CountrySelect from '../CountrySelect'
import { countryLabel } from '../../lib/countries'
import type { HospitalFilterOptions, HospitalFilters } from '../../types/tenant'

/**
 * The three ways to narrow the hospital list. The country picker offers every country in
 * the world; the subdivision picker offers only the ones a hospital is actually in, and
 * follows the country above it — so the two can never be set to a contradiction.
 */
export default function HospitalToolbar({ filters, options, onChange }: {
  filters: HospitalFilters
  options: HospitalFilterOptions | undefined
  onChange: (filters: HospitalFilters) => void
}) {
  const active = Boolean(filters.search || filters.country || filters.subdivision)
  const subdivisions = options?.subdivisions ?? []

  return (
    <div className="hospital-toolbar">
      <TextField size="small" className="hospital-search" label="Search"
        placeholder="Name or identifier" value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
        slotProps={{
          input: { startAdornment: <SearchOutlinedIcon className="search-icon" fontSize="small" /> },
          inputLabel: { shrink: true },
        }} />

      <CountrySelect size="small" value={filters.country}
        onChange={(code) => onChange({ ...filters, country: code, subdivision: '' })} />

      <TextField select size="small" label="District / State / Province"
        value={subdivisions.includes(filters.subdivision) ? filters.subdivision : ''}
        disabled={!subdivisions.length}
        helperText={subdivisions.length ? undefined
          : filters.country
            ? `No hospital in ${countryLabel(filters.country)} has one recorded`
            : 'None recorded yet'}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        onChange={(event) => onChange({ ...filters, subdivision: event.target.value })}>
        <MenuItem value="">Anywhere</MenuItem>
        {subdivisions.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
      </TextField>

      {active && (
        <Button size="small" onClick={() =>
          onChange({ search: '', country: '', subdivision: '' })}>Clear</Button>
      )}
    </div>
  )
}
