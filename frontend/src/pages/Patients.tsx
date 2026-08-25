import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
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

  // window.confirm cannot say what deleting a patient actually costs, and it cannot be
  // styled, focused or tested like the rest of the app. This can.
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function confirmDelete() {
    if (!deleting) return
    try {
      setDeleteError('')
      await deletePatient(deleting.id)
      setDeleting(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this patient')
    }
  }

  return (
    <>
      <PatientPageControls search={search} filters={filters}
        onSearch={setSearch} onFilters={setFilters} onAdd={openNewForm}>
        {error && <p className="patient-error">{error.message}</p>}
        <PatientTable patients={patients} isLoading={isLoading}
          onEdit={openEditForm} onDelete={setDeleting} />
      </PatientPageControls>

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.firstName} ${deleting.lastName}?`}
          message={<>
            Their record and everything filed under it — visits, prescriptions, lab
            results — go with them. This cannot be undone.
          </>}
          confirmLabel="Delete patient" danger
          busy={isSaving} error={deleteError}
          onClose={() => { setDeleteError(''); setDeleting(null) }}
          onConfirm={confirmDelete} />
      )}

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
