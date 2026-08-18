import { useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { parsePhoneNumber } from 'libphonenumber-js'
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
  phoneCountry: 'UG',
  phone: '',
  email: '',
  nationalId: '',
  addressLine: '',
  city: '',
  district: '',
  stateProvince: '',
  country: '',
}

const personalFields: (keyof PatientForm)[] = ['firstName', 'lastName', 'dateOfBirth', 'sex']

export default function PatientFormModal({
  patient,
  isSaving,
  onClose,
  onSave,
}: PatientFormModalProps) {
  const [form, setForm] = useState<PatientForm>(() =>
    patient ? patientToForm(patient) : emptyForm,
  )
  const [touched, setTouched] = useState<Partial<Record<keyof PatientForm, boolean>>>({})
  const [step, setStep] = useState<1 | 2>(1)
  const errors = useMemo(() => validatePatient(form), [form])
  const isValid = Object.keys(errors).length === 0
  const personalStepValid = personalFields.every((field) => !errors[field])

  function goToDetails(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()
    event?.stopPropagation()
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(personalFields.map((field) => [field, true])),
    }))
    if (personalStepValid) setStep(2)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    event.stopPropagation()

    // Submitting from the first screen (including by pressing Enter) only
    // advances the form. Saving is exclusively allowed from screen two.
    if (step === 1) {
      setTouched((current) => ({
        ...current,
        ...Object.fromEntries(personalFields.map((field) => [field, true])),
      }))
      if (personalStepValid) setStep(2)
      return
    }

    if (!isValid) {
      setTouched(Object.fromEntries(
        Object.keys(form).map((field) => [field, true]),
      ) as Record<keyof PatientForm, boolean>)
      return
    }
    await onSave(form)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true"
        aria-labelledby="patient-form-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 id="patient-form-title">{patient ? 'Edit patient' : 'Add patient'}</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <nav className="form-steps" aria-label={`Patient form, step ${step} of 2`}>
          <button type="button" className={`form-step ${step === 1 ? 'active' : ''}`}
            aria-current={step === 1 ? 'step' : undefined} onClick={() => setStep(1)}>
            <span>1</span>
            <div><b>Personal information</b><small>Name and demographics</small></div>
          </button>
          <span className="step-arrow" aria-hidden="true">→</span>
          <button type="button" className={`form-step ${step === 2 ? 'active' : ''}`}
            aria-current={step === 2 ? 'step' : undefined} onClick={() => setStep(2)}>
            <span>2</span>
            <div><b>Patient details</b><small>Contact and identification</small></div>
          </button>
        </nav>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-section-heading">
            <div>
              <h4>{step === 1 ? 'Personal information' : 'Contact & identification'}</h4>
              <p>{step === 1
                ? 'Enter the patient’s basic personal details.'
                : 'Add contact details used by the hospital.'}</p>
            </div>
            <small><span aria-hidden="true">*</span> Required</small>
          </div>

          <PatientFormFields
            step={step}
            form={form}
            setForm={setForm}
            errors={errors}
            touched={touched}
            onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
            lockNationalId={Boolean(patient?.nationalId)}
          />

          <div className="modal-actions">
            {step === 1
              ? <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
              : <button type="button" className="btn ghost" onClick={() => setStep(1)}>← Back</button>}
            {step === 1
              ? <button type="button" className="btn" disabled={!personalStepValid}
                  onClick={goToDetails}>Next →</button>
              : <button type="submit" className="btn" disabled={isSaving || !isValid}>
                  {isSaving ? 'Saving...' : 'Save patient'}
                </button>}
          </div>
        </form>
      </div>
    </div>
  )
}

type PatientFormErrors = Partial<Record<keyof PatientForm, string>>

function validatePatient(form: PatientForm): PatientFormErrors {
  const errors: PatientFormErrors = {}
  const today = new Date().toISOString().slice(0, 10)

  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'
  if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required'
  else if (form.dateOfBirth >= today) errors.dateOfBirth = 'Date of birth must be in the past'
  if (!form.sex) errors.sex = 'Sex is required'
  if (!form.phone.trim()) errors.phone = 'Phone number is required'
  else if (!/^[0-9 ()-]{6,18}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number'
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  return errors
}

function patientToForm(patient: Patient): PatientForm {
  const { country, local } = splitPhone(patient.phone || '')
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth || '',
    sex: patient.sex || '',
    phoneCountry: country,
    phone: local,
    email: patient.email || '',
    nationalId: patient.nationalId || '',
    addressLine: patient.addressLine || '',
    city: patient.city || '',
    district: patient.district || '',
    stateProvince: patient.stateProvince || '',
    country: patient.country || '',
  }
}

function splitPhone(phone: string) {
  try {
    const parsed = parsePhoneNumber(phone)
    return {
      country: parsed.country || 'UG',
      local: parsed.nationalNumber,
    }
  } catch {
    return { country: 'UG', local: phone.replace(/\D/g, '').replace(/^0+/, '') }
  }
}
