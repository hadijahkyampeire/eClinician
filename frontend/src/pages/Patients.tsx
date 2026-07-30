import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'

interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: string
  phone: string
  email: string
  nationalId: string
  address: string
}

interface PatientPage {
  content: Patient[]
  totalElements: number
}

type PatientForm = Omit<Patient, 'id'>

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Patients() {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadPatients = useCallback(async () => {
    if (!tenantId) return

    setLoading(true)
    setError('')

    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
      const response = await fetch(`${API_URL}/api/patients${query}`, {
        headers: { 'X-Tenant-Id': tenantId },
      })

      if (!response.ok) throw new Error('Could not load patients')

      const data: PatientPage = await response.json()
      setPatients(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [search, tenantId])

  useEffect(() => {
    // Loading API data is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPatients()
  }, [loadPatients])

  function openNewForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(patient: Patient) {
    setEditingId(patient.id)
    setForm({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      dateOfBirth: patient.dateOfBirth || '',
      sex: patient.sex || '',
      phone: patient.phone || '',
      email: patient.email || '',
      nationalId: patient.nationalId || '',
      address: patient.address || '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function savePatient(event: FormEvent) {
    event.preventDefault()
    if (!tenantId) return

    setSaving(true)
    setError('')

    try {
      const url = editingId
        ? `${API_URL}/api/patients/${editingId}`
        : `${API_URL}/api/patients`
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          ...form,
          dateOfBirth: form.dateOfBirth || null,
        }),
      })

      if (!response.ok) {
        const details = await response.json().catch(() => null)
        const message = details?.message || Object.values(details || {})[0]
        throw new Error(typeof message === 'string' ? message : 'Could not save patient')
      }

      closeForm()
      await loadPatients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function deletePatient(patient: Patient) {
    if (!tenantId || !window.confirm(`Delete ${patient.firstName} ${patient.lastName}?`)) return

    setError('')
    try {
      const response = await fetch(`${API_URL}/api/patients/${patient.id}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-Id': tenantId },
      })
      if (!response.ok) throw new Error('Could not delete patient')
      await loadPatients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <>
      <div className="page-header patient-header">
        <div>
          <h2>Patients</h2>
          <p>Manage patient information</p>
        </div>
        <button className="btn" onClick={openNewForm}>Add patient</button>
      </div>

      <div className="card">
        <div className="patient-toolbar">
          <input
            aria-label="Search patients"
            placeholder="Search by name or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {error && <p className="patient-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading patients...</p>
        ) : patients.length === 0 ? (
          <p className="empty-state">No patients found.</p>
        ) : (
          <div className="table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><strong>{patient.firstName} {patient.lastName}</strong></td>
                    <td>{patient.sex || '—'}</td>
                    <td>{patient.dateOfBirth || '—'}</td>
                    <td>{patient.phone || '—'}</td>
                    <td>{patient.email || '—'}</td>
                    <td className="table-actions">
                      <button className="link-button" onClick={() => openEditForm(patient)}>Edit</button>
                      <button className="link-button danger" onClick={() => deletePatient(patient)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="patient-form-title">
            <div className="modal-header">
              <h3 id="patient-form-title">{editingId ? 'Edit patient' : 'Add patient'}</h3>
              <button className="close-button" onClick={closeForm} aria-label="Close">×</button>
            </div>

            <form onSubmit={savePatient}>
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
                <button type="button" className="btn ghost" onClick={closeForm}>Cancel</button>
                <button className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
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
