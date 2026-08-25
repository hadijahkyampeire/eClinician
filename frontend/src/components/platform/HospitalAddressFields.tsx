import { FormLabel, TextField } from '@mui/material'
import CountrySelect from '../CountrySelect'
import type { HospitalForm as Form } from '../../types/tenant'

/**
 * Where the hospital is, in the shape international addresses agree on. Nothing here is
 * required — a clinic can be onboarded before anyone has its address — but the console
 * filters on country and subdivision, so a hospital that leaves them blank will not
 * answer those filters. The helper text says so rather than leaving it to be discovered.
 */
export default function HospitalAddressFields({ form, onChange }: {
  form: Form
  onChange: (patch: Partial<Form>) => void
}) {
  const field = (key: keyof Form, label: string, max: number, helper?: string) => (
    <TextField size="small" label={label} value={form[key] as string} helperText={helper}
      slotProps={{ htmlInput: { maxLength: max } }}
      onChange={(event) => onChange({ [key]: event.target.value } as Partial<Form>)} />
  )

  return (
    <div className="hospital-address">
      <FormLabel component="legend" sx={{ fontSize: 13, fontWeight: 600 }}>
        Where it is
        <span className="hospital-address-note">
          Optional — but the console filters clinics by country and district.
        </span>
      </FormLabel>

      <div className="hospital-address-grid">
        {field('addressLine', 'Street address', 255)}
        {field('city', 'City or town', 100)}
        {field('subdivision', 'District / State / Province', 100,
          'Whichever this country calls it.')}
        {field('postalCode', 'Postal code', 20)}
        <CountrySelect size="small" value={form.country}
          onChange={(code) => onChange({ country: code })} />
        {field('phone', 'Phone', 30)}
        {field('email', 'Contact email', 254)}
      </div>
    </div>
  )
}
