import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconButton, Tooltip } from '@mui/material'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
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
      {active
        ? role === 'Clinician'
          ? 'No patients are waiting for you.'
          : 'No patients are currently in the waiting room.'
        : 'No appointment history yet.'}
    </p>
  }
  return (
    <div className="table-wrap">
      <table className="patient-table appointment-table">
        <thead><tr>
          <th>Patient</th><th>Doctor</th><th>Status</th><th>Scheduled</th>
          <th>Checked in</th><th>Waiting since</th><th>Actions</th>
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
              <td>{appointment.waitingAt ? formatDateTime(appointment.waitingAt) : '—'}</td>
              <td className="table-actions">
                {desk && appointment.status === 'CHECKED_IN' && (
                  <IconAction title="Take to the waiting room" disabled={busy}
                    onClick={() => onTransition(appointment.id, 'waiting')}>
                    <HourglassEmptyOutlinedIcon fontSize="small" />
                  </IconAction>
                )}
                {(role === 'Clinician' || role === 'Administrator')
                  && appointment.status === 'IN_SESSION' && (
                  <IconAction title="Document visit"
                    to={`/records?patientId=${appointment.patientId}`}>
                    <DescriptionOutlinedIcon fontSize="small" />
                  </IconAction>
                )}
                {desk && onEdit && editable.includes(appointment.status) && (
                  <IconAction title="Edit appointment" disabled={busy}
                    onClick={() => onEdit(appointment)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconAction>
                )}
                {desk && onCancel && editable.includes(appointment.status) && (
                  <IconAction title="Cancel appointment" danger disabled={busy}
                    onClick={() => onCancel(appointment)}>
                    <EventBusyOutlinedIcon fontSize="small" />
                  </IconAction>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** An action reads as an icon; the words move into the tooltip and the aria-label. */
function IconAction({ title, danger, disabled, to, onClick, children }: {
  title: string
  danger?: boolean
  disabled?: boolean
  to?: string
  onClick?: () => void
  children: ReactNode
}) {
  const className = `table-icon${danger ? ' danger' : ''}`
  const button = to
    ? <IconButton className={className} size="small" component={Link} to={to} aria-label={title}>
        {children}
      </IconButton>
    : <IconButton className={className} size="small" disabled={disabled} aria-label={title}
        onClick={onClick}>
        {children}
      </IconButton>
  // A disabled button fires no hover events, so the span keeps the tooltip reachable.
  return <Tooltip title={title}><span>{button}</span></Tooltip>
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
