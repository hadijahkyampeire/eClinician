import { Autocomplete, TextField, createFilterOptions } from '@mui/material'
import { COUNTRIES, countryOf, type Country } from '../lib/countries'

const contains = createFilterOptions<Country>({ stringify: (country) => country.name })

/**
 * Every country in the world, searchable by name. Autocomplete rather than a select
 * because a 250-item dropdown is only usable if you can type at it.
 *
 * Substring matching alone puts Portugal above Uganda for "uga" — it contains those
 * letters, and sorts earlier. So matches that *start* with what you typed are floated to
 * the top, while the substring match is kept underneath so "states" still finds the
 * United States and "ivoire" still finds Côte d'Ivoire.
 */
export default function CountrySelect({ value, onChange, label = 'Country', size }: {
  value: string
  onChange: (code: string) => void
  label?: string
  size?: 'small' | 'medium'
}) {
  return (
    <Autocomplete
      size={size}
      options={COUNTRIES}
      filterOptions={(options, state) => {
        const matches = contains(options, state)
        const typed = state.inputValue.trim().toLowerCase()
        if (!typed) return matches
        return [...matches].sort((a, b) =>
          Number(b.name.toLowerCase().startsWith(typed))
          - Number(a.name.toLowerCase().startsWith(typed)))
      }}
      value={countryOf(value) ?? null}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, selected) => option.code === selected.code}
      onChange={(_, country) => onChange(country?.code ?? '')}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key: string }
        return (
          <li key={key} {...rest}>
            <span className="filter-country-flag">{option.flag}</span>{option.name}
          </li>
        )
      }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  )
}
