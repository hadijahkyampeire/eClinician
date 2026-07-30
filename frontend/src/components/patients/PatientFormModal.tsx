import { useState, type FormEvent } from 'react'
import type { Patient, PatientForm } from '../../types/patient'
import PatientFormFields from './PatientFormFields'

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
          <PatientFormFields form={form} setForm={setForm} />

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
