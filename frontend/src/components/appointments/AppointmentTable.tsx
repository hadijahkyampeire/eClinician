import { Link } from 'react-router-dom'
import type { Appointment, AppointmentStatus } from '../../types/appointment'

/** The statuses a receptionist may still change: a visit that started is history. */
const editable: AppointmentStatus[] = ['SCHEDULED', 'CHECKED_IN', 'WAITING']

interface Props {
  appointments: Appointment[]
  active?: boolean
  role: string | undefined
  busy: boolean
  onTransition: (id: string, next: 'waiting' | 'complete') => void
  onEdit?: (appointment: Appointment) => void
  onCancel?: (appointment: Appointment) => void
}

export default function AppointmentTable({
  appointments, active, role, busy, onTransition, onEdit, onCancel,
}: Props) {
  const desk = role === 'Receptionist' || role === 'Administrator'
  if (!appointments.length) {
    return <p className="appointment-empty">
      {active ? 'No patients are currently checked in.' : 'No appointment history yet.'}
    </p>
  }
  return (
    <div className="table-wrap">
      <table className="patient-table appointment-table">
        <thead><tr>
          <th>Patient</th><th>Doctor</th><th>Status</th><th>Scheduled</th>
          <th>Checked in</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td><Link className="patient-name-link"
                to={`/patients/${appointment.patientId}`}>{appointment.patientName}</Link></td>
              <td>{appointment.doctorName || 'Unassigned'}</td>
              <td><AppointmentBadge status={appointment.status} /></td>
              <td>{formatDateTime(appointment.scheduledAt)}</td>
              <td>{appointment.checkedInAt ? formatDateTime(appointment.checkedInAt) : '—'}</td>
              <td className="table-actions">
                {desk && appointment.status === 'CHECKED_IN' && (
                  <button className="link-button" disabled={busy}
                    onClick={() => onTransition(appointment.id, 'waiting')}>Mark waiting</button>
                )}
                {(role === 'Clinician' || role === 'Administrator')
                  && appointment.status === 'IN_SESSION' && (
                  <Link className="link-button"
                    to={`/records?patientId=${appointment.patientId}`}>Document visit</Link>
                )}
                {desk && onEdit && editable.includes(appointment.status) && (
                  <button className="link-button" disabled={busy}
                    onClick={() => onEdit(appointment)}>Edit</button>
                )}
                {desk && onCancel && editable.includes(appointment.status) && (
                  <button className="link-button danger" disabled={busy}
                    onClick={() => onCancel(appointment)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AppointmentBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`appointment-status ${status.toLowerCase()}`}>
    {status.replaceAll('_', ' ').toLowerCase()}
  </span>
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
