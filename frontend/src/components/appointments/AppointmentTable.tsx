import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconButton, Tooltip } from '@mui/material'
import RowActions from '../RowActions'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import PriorityHighOutlinedIcon from '@mui/icons-material/PriorityHighOutlined'
import { elapsed } from '../dashboard/time'
import type { Appointment, AppointmentStatus } from '../../types/appointment'
import type { PatientCareStatus } from '../../types/patient'

/**
 * The three things this table is asked to be, which differ in what a row may still do:
 * `queue` is who is in the building, `upcoming` is what is booked, and `past` is what
 * happened — read-only, because a visit that has taken place is a record, not a form.
 */
export type Variant = 'queue' | 'upcoming' | 'past'

/** The statuses a receptionist may still change: a visit that started is history. */
const editable: AppointmentStatus[] = ['SCHEDULED', 'CHECKED_IN', 'WAITING']

const nothingHere: Record<Variant, string> = {
  queue: 'No patients are currently in the waiting room.',
  upcoming: 'Nothing is booked yet.',
  past: 'No appointments took place in this period.',
}

interface Props {
  appointments: Appointment[]
  variant: Variant
  role: string | undefined
  busy: boolean
  onTransition: (id: string, next: 'waiting' | 'complete') => void
  onEdit?: (appointment: Appointment) => void
  onCancel?: (appointment: Appointment) => void
  /** The desk moving someone up the queue, or putting them back in line. */
  onUrgency?: (appointment: Appointment) => void
}

export default function AppointmentTable({
  appointments, variant, role, busy, onTransition, onEdit, onCancel, onUrgency,
}: Props) {
  // One row open at a time: the details are a glance, not a workspace.
  const [open, setOpen] = useState<string | null>(null)
  const desk = role === 'Receptionist' || role === 'Administrator'
  const queue = variant === 'queue'

  if (!appointments.length) {
    return <p className="appointment-empty">
      {queue && role === 'Clinician' ? 'No patients are waiting for you.' : nothingHere[variant]}
    </p>
  }
  return (
    <div className="table-wrap">
      <table className="patient-table appointment-table">
        <thead><tr>
          <th>Patient</th><th>Doctor</th><th>Specialty</th><th>Room</th>
          <th>Status</th><th>Scheduled</th>
          <th>Checked in</th><th>Waiting since</th>
          <th>{variant === 'past' ? 'Details' : 'Actions'}</th>
        </tr></thead>
        <tbody>
          {appointments.map((appointment) => (
            <Fragment key={appointment.id}>
              <tr>
                <td><Link className="patient-name-link"
                  to={`/patients/${appointment.patientId}`}>{appointment.patientName}</Link>
                  {appointment.urgent && <span className="urgent-flag">Urgent</span>}</td>
                <td>{appointment.doctorName || 'Unassigned'}</td>
                <td>{appointment.doctorSpecialty || '—'}</td>
                <td>{appointment.room || '—'}</td>
                <td><AppointmentBadge status={appointment.status}
                  careStatus={appointment.careStatus} /></td>
                <td>{formatDateTime(appointment.scheduledAt, queue)}</td>
                <td>{appointment.checkedInAt
                  ? formatDateTime(appointment.checkedInAt, queue) : '—'}</td>
                {/* The clock time says when; the brackets say how long, which is the number
                    a doctor picking the next patient actually reads. A finished visit's
                    wait is over, so only a live row counts. */}
                <td>{appointment.waitingAt
                  ? <>
                      {formatDateTime(appointment.waitingAt, queue)}
                      {queue && <span className="waiting-for">
                        {' '}({elapsed(appointment.waitingAt)})
                      </span>}
                    </>
                  : '—'}</td>
                <td className="table-actions">
                  {variant === 'past' ? (
                    <IconAction title={open === appointment.id ? 'Hide details' : 'Show details'}
                      expanded={open === appointment.id} controls={`details-${appointment.id}`}
                      onClick={() => setOpen(open === appointment.id ? null : appointment.id)}>
                      <ExpandMoreOutlinedIcon fontSize="small"
                        className={`chevron${open === appointment.id ? ' open' : ''}`} />
                    </IconAction>
                  ) : <>
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
                    {/* Cancelling is the one action here that undoes a booking, so it sits
                        behind the menu rather than a click away from Edit. */}
                    {desk && onCancel && editable.includes(appointment.status) && (
                      <RowActions label={`Actions for ${appointment.patientName}`} actions={[
                        // Whether someone can wait is often only clear after they have
                        // sat down, so it is changeable from the row either way.
                        ...(onUrgency && queue ? [{
                          label: appointment.urgent
                            ? 'No longer urgent' : 'Needs to be seen first',
                          disabled: busy,
                          icon: <PriorityHighOutlinedIcon fontSize="small" />,
                          onClick: () => onUrgency(appointment),
                        }] : []),
                        {
                          label: 'Cancel appointment', danger: true, disabled: busy,
                          icon: <EventBusyOutlinedIcon fontSize="small" />,
                          onClick: () => onCancel(appointment),
                        },
                      ]} />
                    )}
                  </>}
                </td>
              </tr>
              {open === appointment.id && <Details appointment={appointment} />}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * What the row had no column for: why they came, and the rest of the trail. Everything
 * else about the person lives on their record, one link away rather than copied to here.
 */
function Details({ appointment }: { appointment: Appointment }) {
  return (
    <tr className="appointment-details" id={`details-${appointment.id}`}>
      <td colSpan={9}>
        <dl>
          <div><dt>Reason for visit</dt><dd>{appointment.reason || 'Not recorded'}</dd></div>
          <div><dt>Session started</dt><dd>{appointment.sessionStartedAt
            ? formatDateTime(appointment.sessionStartedAt) : 'Never started'}</dd></div>
          <div><dt>Completed</dt><dd>{appointment.completedAt
            ? formatDateTime(appointment.completedAt) : '—'}</dd></div>
          <div><dt>Booked</dt><dd>{formatDateTime(appointment.createdAt)}</dd></div>
        </dl>
        <Link className="btn ghost" to={`/patients/${appointment.patientId}`}>
          Open patient record
        </Link>
      </td>
    </tr>
  )
}

/** An action reads as an icon; the words move into the tooltip and the aria-label. */
function IconAction({ title, danger, disabled, to, onClick, expanded, controls, children }: {
  title: string
  danger?: boolean
  disabled?: boolean
  to?: string
  onClick?: () => void
  expanded?: boolean
  controls?: string
  children: ReactNode
}) {
  const className = `table-icon${danger ? ' danger' : ''}`
  const button = to
    ? <IconButton className={className} size="small" component={Link} to={to} aria-label={title}>
        {children}
      </IconButton>
    : <IconButton className={className} size="small" disabled={disabled} aria-label={title}
        aria-expanded={expanded} aria-controls={controls} onClick={onClick}>
        {children}
      </IconButton>
  // A disabled button fires no hover events, so the span keeps the tooltip reachable.
  return <Tooltip title={title}><span>{button}</span></Tooltip>
}

/** The visit's own state, except while the patient is out of the room for tests. */
function AppointmentBadge({ status, careStatus }: {
  status: AppointmentStatus
  careStatus?: PatientCareStatus | null
}) {
  if (careStatus === 'LAB') {
    return <span className="appointment-status lab">at the lab</span>
  }
  return <span className={`appointment-status ${status.toLowerCase()}`}>
    {status.replaceAll('_', ' ').toLowerCase()}
  </span>
}

// Intl refuses dateStyle alongside weekday, so the parts are spelled out. 'medium' is the
// shape the rest of the app uses: Aug 25, 2026, 10:30 PM.
const stamp = new Intl.DateTimeFormat('en', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
})
const clockTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })

const isToday = (when: Date) => when.toDateString() === new Date().toDateString()

/**
 * The queue is today's arrivals, so a row shows the time alone and the wait reads at a
 * glance; the other tables span weeks, so a row names its weekday. A check-in left standing
 * overnight still gives its date rather than passing itself off as this morning.
 */
function formatDateTime(value: string, timeOnly?: boolean) {
  const when = new Date(value)
  return timeOnly && isToday(when) ? clockTime.format(when) : stamp.format(when)
}
