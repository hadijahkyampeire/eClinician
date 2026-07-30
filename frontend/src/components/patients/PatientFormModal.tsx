import { useState, type FormEvent } from 'react'
import { type Patient, type PatientForm } from '../../api/patients'

interface PatientFormModalProps {
  patient: Patient | null
  isSaving: boolean
  onClose: () => void
  onSave: (form: PatientForm) => Promise<void>
}

const emptyForm: PatientForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  phone: '',
  email: '',
  nationalId: '',
  address: '',
}

export default function PatientFormModal({
  patient,
  isSaving,
  onClose,
  onSave,
}: PatientFormModalProps) {
  const [form, setForm] = useState<PatientForm>(() =>
    patient ? patientToForm(patient) : emptyForm,
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSave(form)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="patient-form-title">
        <div className="modal-header">
          <h3 id="patient-form-title">{patient ? 'Edit patient' : 'Add patient'}</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="patient-form-grid">
            <FormField label="First name" required value={form.firstName}
              onChange={(value) => setForm({ ...form, firstName: value })} />
            <FormField label="Last name" required value={form.lastName}
              onChange={(value) => setForm({ ...form, lastName: value })} />
            <FormField label="Date of birth" type="date" value={form.dateOfBirth}
              onChange={(value) => setForm({ ...form, dateOfBirth: value })} />
            <label className="field">
              <span>Sex</span>
              <select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <FormField label="Phone" value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })} />
            <FormField label="Email" type="email" value={form.email}
              onChange={(value) => setForm({ ...form, email: value })} />
            <FormField label="National ID" value={form.nationalId}
              onChange={(value) => setForm({ ...form, nationalId: value })} />
            <FormField label="Address" value={form.address}
              onChange={(value) => setForm({ ...form, address: value })} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function patientToForm(patient: Patient): PatientForm {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth || '',
    sex: patient.sex || '',
    phone: patient.phone || '',
    email: patient.email || '',
    nationalId: patient.nationalId || '',
    address: patient.address || '',
  }
}

interface FormFieldProps {
  label: string
  value: string
  type?: string
  required?: boolean
  onChange: (value: string) => void
}

function FormField({ label, value, type = 'text', required, onChange }: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
