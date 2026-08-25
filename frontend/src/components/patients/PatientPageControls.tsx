import { useMemo, useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { Autocomplete, Button, MenuItem, TextField } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { getCountries, type CountryCode } from 'libphonenumber-js'
import type { PatientFilters } from '../../types/patient'

interface Props {
  search: string
  filters: PatientFilters
  onSearch: (value: string) => void
  onFilters: (filters: PatientFilters) => void
  onAdd: () => void
  children: ReactNode
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries()
  .map((code: CountryCode) => ({
    code,
    name: displayNames.of(code) || code,
    flag: code.replace(/./g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0))),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function PatientPageControls({
  search, filters, onSearch, onFilters, onAdd, children,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  )
  const change = (field: keyof PatientFilters, value: string) =>
    onFilters({ ...filters, [field]: value })
  const clearFilters = () => onFilters({
    sex: '', country: '', dobFrom: '', dobTo: '', enrolledFrom: '', enrolledTo: '',
    careStatus: '',
    nationalId: '',
  })

  return (
    <>
      <div className="page-header patient-header">
        <div>
          <h2>Patients</h2>
          <p>Manage patient information</p>
        </div>
        <button className="btn" onClick={onAdd}>Add patient</button>
      </div>
      <div className="card">
        <div className="patient-toolbar">
          <TextField className="patient-search" size="small"
            aria-label="Search patients" placeholder="Search name or phone"
            value={search} onChange={(event) => onSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchOutlinedIcon className="search-icon" fontSize="small" />,
              },
            }} />
          <Button className="filter-toggle" variant={activeCount ? 'contained' : 'outlined'}
            startIcon={<TuneOutlinedIcon />}
            onClick={() => setFiltersOpen((open) => !open)}>
            Filters{activeCount ? ` (${activeCount})` : ''}
          </Button>
        </div>

        {filtersOpen && (
          <div className="patient-filter-panel">
            <TextField select size="small" label="Current status" value={filters.careStatus}
              onChange={(event) => change('careStatus', event.target.value)}>
              <MenuItem value="">Any status</MenuItem>
              <MenuItem value="NONE">No active status</MenuItem>
              <MenuItem value="CHECKED_IN">Checked in</MenuItem>
              <MenuItem value="WAITING">Waiting</MenuItem>
              <MenuItem value="IN_SESSION">In session</MenuItem>
              <MenuItem value="PHARMACY">Pharmacy</MenuItem>
            </TextField>
            <TextField select size="small" label="Sex" value={filters.sex}
              onChange={(event) => change('sex', event.target.value)}>
              <MenuItem value="">Any sex</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            <Autocomplete size="small" options={countries}
              value={countries.find((country) => country.code === filters.country) || null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_, country) => change('country', country?.code || '')}
              renderOption={(props, option) => (
                <li {...props} key={option.code}>
                  <span className="filter-country-flag">{option.flag}</span>{option.name}
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Country of residence" />} />
            <TextField size="small" label="Government ID" value={filters.nationalId}
              placeholder="Search ID or passport number"
              onChange={(event) => change('nationalId', event.target.value)} />
            <DatePicker label="Born from" value={filters.dobFrom ? dayjs(filters.dobFrom) : null}
              slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
              onChange={(value) => change('dobFrom',
                value && value.isValid() ? value.format('YYYY-MM-DD') : '')} />
            <DatePicker label="Born to" value={filters.dobTo ? dayjs(filters.dobTo) : null}
              slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
              onChange={(value) => change('dobTo',
                value && value.isValid() ? value.format('YYYY-MM-DD') : '')} />
            <DatePicker label="Enrolled from" value={filters.enrolledFrom ? dayjs(filters.enrolledFrom) : null}
              slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
              onChange={(value) => change('enrolledFrom',
                value && value.isValid() ? value.format('YYYY-MM-DD') : '')} />
            <DatePicker label="Enrolled to" value={filters.enrolledTo ? dayjs(filters.enrolledTo) : null}
              slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
              onChange={(value) => change('enrolledTo',
                value && value.isValid() ? value.format('YYYY-MM-DD') : '')} />
            <div className="filter-panel-actions">
              <button type="button" className="clear-filters" disabled={!activeCount}
                onClick={clearFilters}>Clear filters</button>
            </div>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
