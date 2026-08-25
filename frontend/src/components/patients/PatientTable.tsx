import type { Patient } from '../../types/patient'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined'
import RowActions from '../RowActions'

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
  const navigate = useNavigate()
  const { session } = useAuth()
  const role = session?.user.role

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
            <th>Date added</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="clickable-row" tabIndex={0}
              onClick={() => navigate(`/patients/${patient.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/patients/${patient.id}`)
                }
              }}>
              <td>
                <Link className="patient-name-link" to={`/patients/${patient.id}`}
                  onClick={(event) => event.stopPropagation()}>
                  {patient.firstName} {patient.lastName}
                </Link>
              </td>
              <td>{patient.sex || '—'}</td>
              <td>{patient.dateOfBirth || '—'}</td>
              <td>{patient.phone || '—'}</td>
              <td>{patient.email || '—'}</td>
              <td>{formatDateAdded(patient.createdAt)}</td>
              <td>
                <CareStatus status={patient.activeCareStatus} role={role}
                  onCheckIn={() =>
                    navigate(`/appointments?patientId=${patient.id}&action=check-in`)} />
              </td>
              <td className="table-actions">
                <PatientActions patient={patient} role={role}
                  onEdit={onEdit} onDelete={onDelete}
                  onWorkflow={(action) =>
                    navigate(`/appointments?patientId=${patient.id}&action=${action}`)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CareStatus({
  status, role, onCheckIn,
}: {
  status: Patient['activeCareStatus']
  role: string | undefined
  onCheckIn: () => void
}) {
  if (!status && (role === 'Receptionist' || role === 'Administrator')) {
    return (
      <Button size="small" variant="outlined" startIcon={<LoginOutlinedIcon />}
        onClick={(event) => {
          event.stopPropagation()
          onCheckIn()
        }}>
        Check in
      </Button>
    )
  }
  if (!status) return <span className="care-status none">No active status</span>
  const labels = {
    CHECKED_IN: 'Checked in',
    WAITING: 'Waiting',
    IN_SESSION: 'In session',
    PHARMACY: 'Pharmacy',
  }
  return <span className={`care-status ${status.toLowerCase()}`}>{labels[status]}</span>
}

function PatientActions({
  patient, role, onEdit, onDelete, onWorkflow,
}: {
  patient: Patient
  role: string | undefined
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => void
  onWorkflow: (action: 'check-in' | 'start-session') => void
}) {
  const name = `${patient.firstName} ${patient.lastName}`

  return (
    <>
      {(role === 'Clinician' || role === 'Administrator')
        && (patient.activeCareStatus === 'CHECKED_IN'
          || patient.activeCareStatus === 'WAITING') && (
        <Button size="small" variant="outlined" startIcon={<PlayCircleOutlineIcon />}
          onClick={(event) => {
            event.stopPropagation()
            onWorkflow('start-session')
          }}>Start session</Button>
      )}
      <RowActions label={`Actions for ${name}`} actions={[
        { label: 'Edit patient', icon: <EditOutlinedIcon fontSize="small" />,
          onClick: () => onEdit(patient) },
        { label: 'Delete patient', danger: true, icon: <DeleteOutlineIcon fontSize="small" />,
          onClick: () => onDelete(patient) },
      ]} />
    </>
  )
}

function formatDateAdded(value: string) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
