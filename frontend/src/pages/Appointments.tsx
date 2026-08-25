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
import { PRESETS, covers, describe, type Range } from '../components/dashboard/range'
import type { Appointment, AppointmentForm, AppointmentStatus } from '../types/appointment'

const activeStatuses: AppointmentStatus[] = ['CHECKED_IN', 'WAITING', 'IN_SESSION']

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
      setConfirmation(action === 'check-in'
        ? `${name} is checked in and now in today’s queue.`
        : `Session started for ${name}.`)
      // The arrival is recorded, so drop the intent from the URL: the card has done its job.
      navigate('/appointments', { replace: true })
      await refresh()
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
  const cancel = useMutation({
    mutationFn: (appointment: Appointment) => cancelAppointment(appointment.id),
    onSuccess: refresh,
  })

  useEffect(() => {
    if (!confirmation) return
    const timer = setTimeout(() => setConfirmation(''), 6000)
    return () => clearTimeout(timer)
  }, [confirmation])

  const appointments = appointmentsQuery.data ?? []
  const active = appointments.filter((appointment) =>
    activeStatuses.includes(appointment.status))
  const history = appointments
    .filter((appointment) => !activeStatuses.includes(appointment.status))
    .filter((appointment) => covers(range, appointment.scheduledAt))
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
          <div className="lookback-dates">
            <label>
              <span>From</span>
              <input type="date" value={range.from ?? ''} max={range.to || undefined}
                onChange={e => setRange({ key: 'custom', from: e.target.value || undefined, to: range.to })} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={range.to ?? ''} min={range.from || undefined}
                onChange={e => setRange({ key: 'custom', from: range.from, to: e.target.value || undefined })} />
            </label>
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
