import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MenuItem, TextField } from '@mui/material'
import { getPatients } from '../../api/patients'
import { getClinicians } from '../../api/staff'
import type { Appointment, AppointmentForm } from '../../types/appointment'

interface Props {
  appointment: Appointment | null
  isSaving: boolean
  error?: string
  onClose: () => void
  onSave: (form: AppointmentForm) => void
}

/** SRS 2.1.0 and 2.1.2: book a patient with a doctor, at a date and time. */
export default function AppointmentFormModal({
  appointment, isSaving, error, onClose, onSave,
}: Props) {
  const [form, setForm] = useState<AppointmentForm>({
    patientId: appointment?.patientId || '',
    doctorId: appointment?.doctorId || '',
    scheduledAt: toLocalInput(appointment?.scheduledAt),
    reason: appointment?.reason || '',
  })
  const patients = useQuery({ queryKey: ['patients', 'booking'], queryFn: () => getPatients() })
  const availableAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined
  const clinicians = useQuery({
    queryKey: ['clinicians', availableAt],
    queryFn: () => getClinicians(availableAt),
    enabled: Boolean(availableAt),
  })
  const set = (field: keyof AppointmentForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.patientId && form.doctorId) onSave(form)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true"
        aria-labelledby="appointment-form-title">
        <div className="modal-header">
          <h3 id="appointment-form-title">
            {appointment ? 'Edit appointment' : 'Book appointment'}
          </h3>
          <button type="button" className="close-button" onClick={onClose}
            aria-label="Close">×</button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <TextField select required size="small" fullWidth label="Patient"
            value={form.patientId} disabled={Boolean(appointment)}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            onChange={(event) => set('patientId', event.target.value)}>
            <MenuItem value="" disabled>Select a patient</MenuItem>
            {patients.data?.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </MenuItem>
            ))}
          </TextField>
          <TextField select required size="small" fullWidth label="Doctor"
            value={form.doctorId} onChange={(event) => set('doctorId', event.target.value)}
            helperText={form.scheduledAt
              ? 'Only clinicians available at this time are shown'
              : 'Choose a date and time to see available clinicians'}>
              <MenuItem value="" disabled>Select an available clinician</MenuItem>
              {clinicians.data?.map((doctor) => (
                <MenuItem key={doctor.id} value={doctor.id}>
                  {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                  {doctor.consultationRoom ? ` — ${doctor.consultationRoom}` : ''}
                </MenuItem>
              ))}
          </TextField>
          {/* A date input is never visually empty — the browser draws its own
              placeholder — so the label is pinned open rather than overlapping it. */}
          <TextField type="datetime-local" required size="small" fullWidth
            label="Date and time" value={form.scheduledAt}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(event) => set('scheduledAt', event.target.value)} />
          <TextField size="small" fullWidth label="Reason for visit" value={form.reason}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            onChange={(event) => set('reason', event.target.value)} />

          {error && <p className="patient-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn"
              disabled={isSaving || !form.patientId || !form.doctorId}>
              {isSaving ? 'Saving...' : appointment ? 'Save changes' : 'Book appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** A datetime-local input wants local "YYYY-MM-DDTHH:mm", not a UTC instant. */
function toLocalInput(iso?: string) {
  const date = iso ? new Date(iso) : new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16)
}
