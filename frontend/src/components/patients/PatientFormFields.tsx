import type { Dispatch, SetStateAction } from 'react'
import { Autocomplete, MenuItem, TextField } from '@mui/material'
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js'
import type { PatientForm } from '../../types/patient'

interface Props {
  step: 1 | 2
  form: PatientForm
  setForm: Dispatch<SetStateAction<PatientForm>>
  errors: Partial<Record<keyof PatientForm, string>>
  touched: Partial<Record<keyof PatientForm, boolean>>
  onBlur: (field: keyof PatientForm) => void
  /** SRS 1.2: an ID recorded at registration is not editable afterwards. */
  lockNationalId?: boolean
}

interface CountryOption {
  code: CountryCode
  name: string
  callingCode: string
  flag: string
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryOptions: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: displayNames.of(code) || code,
    callingCode: `+${getCountryCallingCode(code)}`,
    flag: code.replace(/./g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0))),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function PatientFormFields({
  step, form, setForm, errors, touched, onBlur, lockNationalId,
}: Props) {
  const change = (field: keyof PatientForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))
  const error = (field: keyof PatientForm) => touched[field] ? errors[field] : undefined

  const textField = (
    field: keyof PatientForm,
    label: string,
    options: {
      required?: boolean
      disabled?: boolean
      type?: string
      placeholder?: string
      autoComplete?: string
      fullWidth?: boolean
      helperText?: string
    } = {},
  ) => (
    <TextField
      className={options.fullWidth ? 'form-field form-field-wide' : 'form-field'}
      size="small"
      fullWidth
      required={options.required}
      disabled={options.disabled}
      type={options.type}
      label={label}
      value={form[field]}
      placeholder={options.placeholder}
      autoComplete={options.autoComplete}
      error={Boolean(error(field))}
      helperText={error(field) || options.helperText || ' '}
      slotProps={options.type === 'date' ? {
        inputLabel: { shrink: true },
        htmlInput: { max: new Date().toISOString().slice(0, 10) },
      } : undefined}
      onBlur={() => onBlur(field)}
      onChange={(event) => change(field, event.target.value)}
    />
  )

  if (step === 1) {
    return (
      <div className="patient-form-grid mui-form-grid">
        {textField('firstName', 'First name', {
          required: true, autoComplete: 'given-name',
        })}
        {textField('lastName', 'Last name', {
          required: true, autoComplete: 'family-name',
        })}
        {textField('dateOfBirth', 'Date of birth', { required: true, type: 'date' })}
        <TextField className="form-field" size="small" fullWidth select required
          label="Sex" value={form.sex} error={Boolean(error('sex'))}
          helperText={error('sex') || ' '}
          onBlur={() => onBlur('sex')}
          onChange={(event) => change('sex', event.target.value)}>
          <MenuItem value="Female">Female</MenuItem>
          <MenuItem value="Male">Male</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </div>
    )
  }

  const selectedPhoneCountry = countryOptions.find(
    (country) => country.code === form.phoneCountry,
  ) || null
  const selectedAddressCountry = countryOptions.find(
    (country) => country.code === form.country,
  ) || null

  return (
    <div className="patient-form-grid mui-form-grid">
      <Autocomplete
        className="form-field"
        size="small"
        options={countryOptions}
        value={selectedPhoneCountry}
        autoHighlight
        getOptionLabel={(option) => `${option.name} ${option.callingCode}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        onChange={(_, country) => change('phoneCountry', country?.code || 'UG')}
        renderOption={(props, option) => (
          <li {...props} key={option.code}>
            <span className="country-option-flag">{option.flag}</span>
            <span className="country-option-name">{option.name}</span>
            <span className="country-option-code">{option.callingCode}</span>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} required label="Phone country"
            helperText="Search by country or calling code"
            slotProps={{
              input: {
                ...params.slotProps.input,
                startAdornment: (
                  <>
                    <span className="selected-country-flag">
                      {selectedPhoneCountry?.flag}
                    </span>
                    {params.slotProps.input.startAdornment}
                  </>
                ),
              },
            }} />
        )}
      />
      {textField('phone', 'Phone number', {
        required: true,
        type: 'tel',
        autoComplete: 'tel-national',
        placeholder: '700 000000',
      })}
      {textField('email', 'Email', {
        type: 'email', autoComplete: 'email', placeholder: 'patient@example.com',
      })}
      {textField('nationalId', 'Government-issued ID', {
        disabled: lockNationalId,
        helperText: lockNationalId
          ? 'Recorded at registration and cannot be changed'
          : 'National ID, passport, alien ID, or other local identifier',
      })}

      <div className="address-section form-field-wide">
        <div>
          <h5>Residential address</h5>
          <p>Use the closest equivalent fields available in the patient’s country.</p>
        </div>
      </div>
      {textField('addressLine', 'Street / address line', {
        fullWidth: true, autoComplete: 'address-line1',
      })}
      {textField('city', 'City / locality', { autoComplete: 'address-level2' })}
      {textField('district', 'District / county', { autoComplete: 'address-level3' })}
      {textField('stateProvince', 'State / province / region', {
        autoComplete: 'address-level1',
      })}
      <Autocomplete
        className="form-field"
        size="small"
        options={countryOptions}
        value={selectedAddressCountry}
        autoHighlight
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        onChange={(_, country) => change('country', country?.code || '')}
        renderOption={(props, option) => (
          <li {...props} key={option.code}>
            <span className="country-option-flag">{option.flag}</span>
            <span className="country-option-name">{option.name}</span>
            <span className="country-option-code">{option.code}</span>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} label="Country" helperText="Search all countries"
            autoComplete="country-name" />
        )}
      />
    </div>
  )
}
