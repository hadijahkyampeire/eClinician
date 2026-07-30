import type { Patient } from '../../types/patient'

interface PatientTableProps {
  patients: Patient[]
  isLoading: boolean
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => void
}

export default function PatientTable({
  patients,
  isLoading,
  onEdit,
  onDelete,
}: PatientTableProps) {
  if (isLoading) return <p className="empty-state">Loading patients...</p>
  if (patients.length === 0) return <p className="empty-state">No patients found.</p>

  return (
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
                <button className="link-button" onClick={() => onEdit(patient)}>Edit</button>
                <button className="link-button danger" onClick={() => onDelete(patient)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
