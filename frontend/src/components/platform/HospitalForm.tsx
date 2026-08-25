import { useState, type FormEvent } from 'react'
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined'
import ModulePicker from './ModulePicker'
import FirstAdminFields from './FirstAdminFields'
import HospitalAddressFields from './HospitalAddressFields'
import type { Hospital, HospitalForm as Form } from '../../types/tenant'

interface Props {
  hospital: Hospital | null
  isSaving: boolean
  error?: string
  onClose: () => void
  onSave: (form: Form) => void
}

/** Onboarding a hospital, and deciding which modules its subscription includes. */
export default function HospitalForm({ hospital, isSaving, error, onClose, onSave }: Props) {
  const [form, setForm] = useState<Form>({
    id: hospital?.id || '',
    name: hospital?.name || '',
    primaryColor: hospital?.primaryColor || '#0f766e',
    modules: hospital?.enabledModules || ['patients', 'appointments', 'records'],
    addressLine: hospital?.addressLine || '',
    city: hospital?.city || '',
    subdivision: hospital?.subdivision || '',
    postalCode: hospital?.postalCode || '',
    country: hospital?.country || '',
    phone: hospital?.phone || '',
    email: hospital?.email || '',
    adminName: '', adminEmail: '', adminPassword: '',
  })
  const onboarding = !hospital
  const update = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }))

  const incomplete = !form.name.trim() || !form.id.trim()
    || (onboarding && !form.adminEmail?.trim())

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave(form)
  }

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        {hospital ? 'Edit hospital' : 'Onboard a hospital'}
        <IconButton aria-label="Close" onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'grid', gap: 2.5 }}>
        <TextField required autoFocus label="Hospital name" value={form.name}
          slotProps={{ htmlInput: { maxLength: 150 } }}
          onChange={(event) => update({ name: event.target.value })} />
        <TextField required label="Identifier" value={form.id} disabled={Boolean(hospital)}
          placeholder="st-marys-hospital"
          slotProps={{ htmlInput: { pattern: '[a-z0-9]+(-[a-z0-9]+)*' } }}
          helperText={hospital
            ? 'Fixed: it is written into every row this hospital owns.'
            : 'Lowercase letters, numbers and hyphens. It cannot be changed afterwards.'}
          onChange={(event) => update({ id: event.target.value })} />
        <TextField type="color" label="Brand colour" value={form.primaryColor}
          slotProps={{ inputLabel: { shrink: true } }}
          helperText="Every screen at this hospital is drawn from it."
          onChange={(event) => update({ primaryColor: event.target.value })} />

        <HospitalAddressFields form={form} onChange={update} />
        <ModulePicker selected={form.modules}
          onChange={(modules) => update({ modules })} />
        {onboarding && <FirstAdminFields form={form} onChange={update} />}

        {error && <p className="patient-error">{error}</p>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={isSaving || incomplete}
          startIcon={hospital ? <SaveOutlinedIcon /> : <AddBusinessOutlinedIcon />}>
          {isSaving ? 'Saving…' : hospital ? 'Save changes' : 'Onboard hospital'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
