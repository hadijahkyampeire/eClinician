import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  checkInPatient,
  completeAppointment,
  getAppointments,
  markAppointmentWaiting,
  startPatientSession,
} from '../api/appointments'
import { getPatient } from '../api/patients'
import { useAuth } from '../auth/AuthContext'
import type { Appointment, AppointmentStatus } from '../types/appointment'

const activeStatuses: AppointmentStatus[] = ['CHECKED_IN', 'WAITING', 'IN_SESSION']

export default function Appointments() {
  const [params] = useSearchParams()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const patientId = params.get('patientId')
  const action = params.get('action')
  const tenantId = session?.tenant?.id
  const allowed =
    session?.user.role === 'Administrator' ||
    (action === 'check-in' && session?.user.role === 'Receptionist') ||
    (action === 'start-session' && session?.user.role === 'Clinician')

  const patientQuery = useQuery({
    queryKey: ['patient', tenantId, patientId],
    queryFn: () => getPatient(tenantId!, patientId!),
    enabled: Boolean(tenantId && patientId && allowed),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tenantId],
    queryFn: () => getAppointments(tenantId!),
    enabled: Boolean(tenantId),
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['patients', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['patient', tenantId] }),
    ])
  }
  const workflow = useMutation({
    mutationFn: () => action === 'check-in'
      ? checkInPatient(tenantId!, patientId!)
      : startPatientSession(tenantId!, patientId!),
    onSuccess: refresh,
  })
  const transition = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'waiting' | 'complete' }) =>
      next === 'waiting'
        ? markAppointmentWaiting(tenantId!, id)
        : completeAppointment(tenantId!, id),
    onSuccess: refresh,
  })

  const appointments = appointmentsQuery.data ?? []
  const active = appointments.filter((appointment) =>
    activeStatuses.includes(appointment.status))
  const history = appointments.filter((appointment) =>
    !activeStatuses.includes(appointment.status))
  const error = workflow.error || transition.error || appointmentsQuery.error

  return (
    <>
      <div className="page-header">
        <h2>Appointments</h2>
        <p>Manage today’s patient flow and appointment history</p>
      </div>

      {patientId && allowed && (
        <div className="card appointment-context">
          <div>
            <span className="appointment-context-label">
              {action === 'check-in' ? 'Patient check-in' : 'Clinical session'}
            </span>
            <h3>{patientQuery.data
              ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}`
              : 'Loading patient...'}</h3>
            <p>{action === 'check-in'
              ? 'Confirm the patient’s arrival and add them to today’s queue.'
              : 'Start the consultation for this checked-in patient.'}</p>
          </div>
          <div className="appointment-context-actions">
            <Link className="btn ghost"
              to={patientQuery.data ? `/patients/${patientQuery.data.id}` : '/patients'}>
              Back
            </Link>
            <button className="btn" disabled={!patientQuery.data || workflow.isPending}
              onClick={() => workflow.mutate()}>
              {workflow.isPending
                ? 'Updating...'
                : action === 'check-in' ? 'Confirm check-in' : 'Start session'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="patient-error">{error.message}</p>}

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Active patient queue</h3>
            <p>Only patients currently moving through care appear here.</p>
          </div>
          <span>{active.length} active</span>
        </div>
        <AppointmentTable appointments={active} active role={session?.user.role}
          busy={transition.isPending}
          onTransition={(id, next) => transition.mutate({ id, next })} />
      </section>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Appointment history</h3>
            <p>Completed and historical appointment states remain available.</p>
          </div>
        </div>
        <AppointmentTable appointments={history} role={session?.user.role}
          busy={false} onTransition={() => undefined} />
      </section>
    </>
  )
}

function AppointmentTable({
  appointments, active, role, busy, onTransition,
}: {
  appointments: Appointment[]
  active?: boolean
  role: string | undefined
  busy: boolean
  onTransition: (id: string, next: 'waiting' | 'complete') => void
}) {
  if (!appointments.length) {
    return <p className="appointment-empty">
      {active ? 'No patients are currently checked in.' : 'No appointment history yet.'}
    </p>
  }
  return (
    <div className="table-wrap">
      <table className="patient-table appointment-table">
        <thead><tr>
          <th>Patient</th><th>Status</th><th>Scheduled</th><th>Checked in</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td><Link className="patient-name-link"
                to={`/patients/${appointment.patientId}`}>{appointment.patientName}</Link></td>
              <td><AppointmentBadge status={appointment.status} /></td>
              <td>{formatDateTime(appointment.scheduledAt)}</td>
              <td>{appointment.checkedInAt ? formatDateTime(appointment.checkedInAt) : '—'}</td>
              <td className="table-actions">
                {(role === 'Receptionist' || role === 'Administrator')
                  && appointment.status === 'CHECKED_IN' && (
                  <button className="link-button" disabled={busy}
                    onClick={() => onTransition(appointment.id, 'waiting')}>Mark waiting</button>
                )}
                {(role === 'Clinician' || role === 'Administrator')
                  && appointment.status === 'IN_SESSION' && (
                  <Link className="link-button"
                    to={`/records?patientId=${appointment.patientId}`}>
                    Document visit
                  </Link>
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
