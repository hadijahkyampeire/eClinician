import { useAuth } from '../auth/AuthContext'
import PatientFormModal from '../components/patients/PatientFormModal'
import PatientPageControls from '../components/patients/PatientPageControls'
import PatientTable from '../components/patients/PatientTable'
import { usePatients } from '../hooks/usePatients'
import { usePatientStore } from '../stores/usePatientStore'
import type { Patient, PatientForm } from '../types/patient'

export default function Patients() {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const {
    search,
    filters,
    formOpen,
    editingPatient,
    setSearch,
    setFilters,
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
  } = usePatients(tenantId, search, filters)

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
      <PatientPageControls search={search} filters={filters}
        onSearch={setSearch} onFilters={setFilters} onAdd={openNewForm}>
        {error && <p className="patient-error">{error.message}</p>}
        <PatientTable patients={patients} isLoading={isLoading}
          onEdit={openEditForm} onDelete={removePatient} />
      </PatientPageControls>

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
