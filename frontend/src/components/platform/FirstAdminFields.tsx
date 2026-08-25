import { FormLabel, TextField } from '@mui/material'
import type { HospitalForm as Form } from '../../types/tenant'

/**
 * The account that turns an empty hospital into a working one. It is created in the same
 * transaction as the hospital: a clinic nobody can sign in to would be worse than none.
 */
export default function FirstAdminFields({ form, onChange }: {
  form: Form
  onChange: (patch: Partial<Form>) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <FormLabel component="legend" sx={{ fontSize: 13, fontWeight: 600 }}>
        First administrator
        <span style={{ display: 'block', fontWeight: 400, fontSize: 12, marginTop: 2 }}>
          They sign in immediately and add the rest of the clinic's staff themselves.
        </span>
      </FormLabel>
      <TextField required size="small" label="Full name" value={form.adminName}
        slotProps={{ htmlInput: { maxLength: 150 } }}
        onChange={(event) => onChange({ adminName: event.target.value })} />
      <TextField required size="small" type="email" label="Email" value={form.adminEmail}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        onChange={(event) => onChange({ adminEmail: event.target.value })} />
      <TextField required size="small" type="password" label="Password"
        value={form.adminPassword} helperText="At least 8 characters."
        slotProps={{ htmlInput: { minLength: 8 } }}
        onChange={(event) => onChange({ adminPassword: event.target.value })} />
    </div>
  )
}
