import { type Patient, type PatientForm } from '../api/patients'
import { useAuth } from '../auth/AuthContext'
import PatientFormModal from '../components/patients/PatientFormModal'
import { usePatients } from '../hooks/usePatients'
import { usePatientStore } from '../stores/usePatientStore'

export default function Patients() {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const {
    search,
    formOpen,
    editingPatient,
    setSearch,
    openNewForm,
    openEditForm,
    closeForm,
  } = usePatientStore()
  const {
    patients,
    isLoading,
    error,
    createPatient,
    updatePatient,
    deletePatient,
    isSaving,
  } = usePatients(tenantId, search)

  async function savePatient(form: PatientForm) {
    if (editingPatient) {
      await updatePatient({ id: editingPatient.id, patient: form })
    } else {
      await createPatient(form)
    }
    closeForm()
  }

  async function removePatient(patient: Patient) {
    const confirmed = window.confirm(`Delete ${patient.firstName} ${patient.lastName}?`)
    if (confirmed) await deletePatient(patient.id)
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

        {error && <p className="patient-error">{error.message}</p>}

        {isLoading ? (
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
                      <button className="link-button danger" onClick={() => removePatient(patient)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <PatientFormModal
          key={editingPatient?.id || 'new'}
          patient={editingPatient}
          isSaving={isSaving}
          onClose={closeForm}
          onSave={savePatient}
        />
      )}
    </>
  )
}
