import type { Dispatch, SetStateAction } from 'react'
import type { PatientForm } from '../../types/patient'

interface Props {
  form: PatientForm
  setForm: Dispatch<SetStateAction<PatientForm>>
}

export default function PatientFormFields({ form, setForm }: Props) {
  const change = (field: keyof PatientForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  return (
    <div className="patient-form-grid">
      <Field label="First name" required value={form.firstName}
        onChange={(value) => change('firstName', value)} />
      <Field label="Last name" required value={form.lastName}
        onChange={(value) => change('lastName', value)} />
      <Field label="Date of birth" type="date" value={form.dateOfBirth}
        onChange={(value) => change('dateOfBirth', value)} />
      <label className="field">
        <span>Sex</span>
        <select value={form.sex} onChange={(event) => change('sex', event.target.value)}>
          <option value="">Select</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <Field label="Phone" value={form.phone}
        onChange={(value) => change('phone', value)} />
      <Field label="Email" type="email" value={form.email}
        onChange={(value) => change('email', value)} />
      <Field label="National ID" value={form.nationalId}
        onChange={(value) => change('nationalId', value)} />
      <Field label="Address" value={form.address}
        onChange={(value) => change('address', value)} />
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  type?: string
  required?: boolean
  onChange: (value: string) => void
}

function Field({ label, value, type = 'text', required, onChange }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} required={required}
        onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
