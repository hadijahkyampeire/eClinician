import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  cancelAppointment,
  checkInPatient,
  completeAppointment,
  getAppointments,
  markAppointmentWaiting,
  scheduleAppointment,
  startPatientSession,
  updateAppointment,
} from '../api/appointments'
import { getPatient } from '../api/patients'
import { useAuth } from '../auth/AuthContext'
import AppointmentFormModal from '../components/appointments/AppointmentFormModal'
import AppointmentTable from '../components/appointments/AppointmentTable'
import type { Appointment, AppointmentForm, AppointmentStatus } from '../types/appointment'

const activeStatuses: AppointmentStatus[] = ['CHECKED_IN', 'WAITING', 'IN_SESSION']

export default function Appointments() {
  const [params] = useSearchParams()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [booking, setBooking] = useState<Appointment | null | undefined>(undefined)
  const patientId = params.get('patientId')
  const action = params.get('action')
  const tenantId = session?.tenant?.id
  const role = session?.user.role
  const canBook = role === 'Receptionist' || role === 'Administrator'
  const allowed =
    role === 'Administrator' ||
    (action === 'check-in' && role === 'Receptionist') ||
    (action === 'start-session' && role === 'Clinician')

  const patientQuery = useQuery({
    queryKey: ['patient', tenantId, patientId],
    queryFn: () => getPatient(patientId!),
    enabled: Boolean(tenantId && patientId && allowed),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tenantId],
    queryFn: () => getAppointments(),
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
      ? checkInPatient(patientId!)
      : startPatientSession(patientId!),
    onSuccess: refresh,
  })
  const transition = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'waiting' | 'complete' }) =>
      next === 'waiting'
        ? markAppointmentWaiting(id)
        : completeAppointment(id),
    onSuccess: refresh,
  })
  const save = useMutation({
    mutationFn: (form: AppointmentForm) => booking
      ? updateAppointment(booking.id, form)
      : scheduleAppointment(form),
    onSuccess: async () => {
      setBooking(undefined)
      await refresh()
    },
  })
  const cancel = useMutation({
    mutationFn: (appointment: Appointment) => cancelAppointment(appointment.id),
    onSuccess: refresh,
  })

  const appointments = appointmentsQuery.data ?? []
  const active = appointments.filter((appointment) =>
    activeStatuses.includes(appointment.status))
  const history = appointments.filter((appointment) =>
    !activeStatuses.includes(appointment.status))
  const error = workflow.error || transition.error || cancel.error || appointmentsQuery.error
  const tableActions = canBook
    ? { onEdit: setBooking, onCancel: (a: Appointment) => cancel.mutate(a) }
    : {}

  return (
    <>
      <div className="page-header appointment-page-header">
        <div>
          <h2>Appointments</h2>
          <p>Book visits, and manage today’s patient flow</p>
        </div>
        {canBook && (
          <button className="btn" onClick={() => setBooking(null)}>Book appointment</button>
        )}
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
        <AppointmentTable appointments={active} active role={role}
          busy={transition.isPending || cancel.isPending}
          onTransition={(id, next) => transition.mutate({ id, next })}
          {...tableActions} />
      </section>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Appointment history</h3>
            <p>Booked, completed and cancelled appointments remain available.</p>
          </div>
        </div>
        <AppointmentTable appointments={history} role={role} busy={cancel.isPending}
          onTransition={() => undefined} {...tableActions} />
      </section>

      {booking !== undefined && (
        <AppointmentFormModal
          appointment={booking}
          isSaving={save.isPending}
          error={save.error?.message}
          onClose={() => { save.reset(); setBooking(undefined) }}
          onSave={(form) => save.mutate(form)}
        />
      )}
    </>
  )
}
