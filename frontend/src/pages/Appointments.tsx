import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MenuItem, TextField } from '@mui/material'
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
import { getClinicians } from '../api/staff'
import { useAuth } from '../auth/AuthContext'
import AppointmentFormModal from '../components/appointments/AppointmentFormModal'
import AppointmentTable from '../components/appointments/AppointmentTable'
import ConfirmDialog from '../components/ConfirmDialog'
import DateRangeFields from '../components/DateRangeFields'
import { PRESETS, covers, describe, type Range } from '../components/dashboard/range'
import type { Appointment, AppointmentForm, AppointmentStatus } from '../types/appointment'

const activeStatuses: AppointmentStatus[] = ['CHECKED_IN', 'WAITING', 'IN_SESSION']

/** Where a patient stands in the queue: when they arrived, not when the row was made. */
const queuedAt = (appointment: Appointment) =>
  appointment.checkedInAt ?? appointment.scheduledAt

/**
 * A booking that has not happened yet is not history, and putting it there hid it: the
 * look-back windows all end tonight, so next week's appointment fell out of both tables
 * and only reappeared under "All time".
 */
const isUpcoming = (appointment: Appointment) => appointment.status === 'SCHEDULED'

export default function Appointments() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [booking, setBooking] = useState<Appointment | null | undefined>(undefined)
  const [confirmation, setConfirmation] = useState('')
  const [checkInDoctorId, setCheckInDoctorId] = useState('')
  // History opens on the last week rather than today: the reason to be on this table at
  // all is usually a visit that has already happened.
  const [range, setRange] = useState<Range>({ key: 'last7' })
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
    // The queue shows how long each patient has been waiting, so it has to keep moving
    // on its own. Same beat as the dashboard panels.
    refetchInterval: 30_000,
  })
  const cliniciansQuery = useQuery({
    queryKey: ['clinicians', tenantId],
    queryFn: () => getClinicians(new Date().toISOString()),
    enabled: Boolean(tenantId && action === 'check-in' && role === 'Receptionist'),
  })
  const bookedDoctorId = appointmentsQuery.data?.find(appointment =>
    appointment.patientId === patientId
      && ['SCHEDULED', 'CHECKED_IN', 'WAITING'].includes(appointment.status))?.doctorId

  useEffect(() => {
    // Preserve the clinician already chosen when a booked patient arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (action === 'check-in' && bookedDoctorId) setCheckInDoctorId(bookedDoctorId)
  }, [action, bookedDoctorId])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['patients', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['patient', tenantId] }),
    ])
  }
  const workflow = useMutation({
    mutationFn: () => action === 'check-in'
      ? checkInPatient(patientId!, checkInDoctorId)
      : startPatientSession(patientId!),
    onSuccess: async () => {
      const name = patientQuery.data
        ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}`
        : 'The patient'
      // Only the desk needs telling. The clinician is about to land on the chart, which
      // says more than a banner would.
      if (action === 'check-in') setConfirmation(`${name} is checked in and now in today’s queue.`)
      await refresh()
      // Check-in ends at the desk, so the card just drops its intent from the URL. A
      // session ends in the consulting room, so it opens the chart it is about to fill.
      navigate(action === 'check-in'
        ? '/appointments'
        : `/records?patientId=${patientId}`, { replace: true })
    },
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
  const [cancelling, setCancelling] = useState<Appointment | null>(null)

  const cancel = useMutation({
    mutationFn: (appointment: Appointment) => cancelAppointment(appointment.id),
    onSuccess: () => { setCancelling(null); return refresh() },
  })

  useEffect(() => {
    if (!confirmation) return
    const timer = setTimeout(() => setConfirmation(''), 6000)
    return () => clearTimeout(timer)
  }, [confirmation])

  const appointments = appointmentsQuery.data ?? []
  // A doctor takes the next patient off the top, so the queue runs in the order people
  // arrived: whoever checked in first is first. The API sorts newest-created first, which
  // is right for the history below and exactly backwards here.
  const active = appointments
    .filter((appointment) => activeStatuses.includes(appointment.status))
    .sort((a, b) => queuedAt(a).localeCompare(queuedAt(b)))
  const upcoming = appointments.filter(isUpcoming)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const history = appointments
    .filter((appointment) =>
      !activeStatuses.includes(appointment.status) && !isUpcoming(appointment))
    .filter((appointment) => covers(range, appointment.scheduledAt))
  const error = workflow.error || transition.error || cancel.error || appointmentsQuery.error
  const tableActions = canBook
    ? { onEdit: setBooking, onCancel: setCancelling }
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
              ? 'Confirm arrival and assign the clinician whose room the patient should wait for.'
              : 'Start the consultation for this checked-in patient.'}</p>
            {action === 'check-in' && role === 'Receptionist' && (
              <TextField className="appointment-doctor-choice" select size="small" fullWidth
                label="Preferred clinician" value={checkInDoctorId}
                onChange={event => setCheckInDoctorId(event.target.value)}
                helperText={cliniciansQuery.isLoading
                  ? 'Loading clinicians scheduled today…'
                  : 'Choose the clinician whose room the patient should wait for'}>
                <MenuItem value="" disabled>Select an available clinician</MenuItem>
                {cliniciansQuery.data?.map(doctor => <MenuItem key={doctor.id} value={doctor.id}>
                  {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                  {doctor.consultationRoom ? ` — ${doctor.consultationRoom}` : ''}
                </MenuItem>)}
              </TextField>
            )}
          </div>
          <div className="appointment-context-actions">
            <Link className="btn ghost"
              to={patientQuery.data ? `/patients/${patientQuery.data.id}` : '/patients'}>
              Back
            </Link>
            <button className="btn"
              disabled={!patientQuery.data || workflow.isPending
                || (action === 'check-in' && !checkInDoctorId)}
              onClick={() => workflow.mutate()}>
              {workflow.isPending
                ? 'Updating...'
                : action === 'check-in' ? 'Confirm check-in' : 'Start session'}
            </button>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="card notice success" role="status">{confirmation}</div>
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
        <AppointmentTable appointments={active} variant="queue" role={role}
          busy={transition.isPending || cancel.isPending}
          onTransition={(id, next) => transition.mutate({ id, next })}
          {...tableActions} />
      </section>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Upcoming appointments</h3>
            <p>Booked visits that have not started yet, soonest first.</p>
          </div>
          <span>{upcoming.length} booked</span>
        </div>
        <AppointmentTable appointments={upcoming} variant="upcoming" role={role}
          busy={cancel.isPending} onTransition={() => undefined} {...tableActions} />
      </section>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Appointment history</h3>
            <p>Visits that have taken place. A past appointment is a record, not a form.</p>
          </div>
          <span>{history.length} in {describe(range)}</span>
        </div>

        <div className="lookback-filter">
          <div className="lookback-presets" role="group" aria-label="Period">
            {PRESETS.map(preset => (
              <button key={preset.key} type="button"
                className={`chip${range.key === preset.key ? ' on' : ''}`}
                aria-pressed={range.key === preset.key}
                onClick={() => setRange({ key: preset.key })}>
                {preset.label}
              </button>
            ))}
          </div>
          <DateRangeFields from={range.from} to={range.to}
            onChange={(from, to) => setRange({ key: 'custom', from, to })} />
        </div>
        <AppointmentTable appointments={history} variant="past" role={role}
          busy={false} onTransition={() => undefined} />
      </section>

      {cancelling && (
        <ConfirmDialog
          title="Cancel this appointment?"
          message={<>
            {cancelling.patientName}'s appointment on {describeWhen(cancelling.scheduledAt)}{' '}
            will be marked cancelled. It stays in the history, and the slot frees up.
            Rebooking means creating a new appointment.
          </>}
          confirmLabel="Cancel appointment" danger
          busy={cancel.isPending} error={cancel.error?.message}
          onClose={() => { cancel.reset(); setCancelling(null) }}
          onConfirm={() => cancel.mutate(cancelling)} />
      )}

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

/** The when, in the words the confirmation needs — not the table's compact form. */
function describeWhen(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' })
    .format(new Date(value))
}
