import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getPatient } from '../api/patients'
import { getAppointments } from '../api/appointments'
import { getEncounters } from '../api/encounters'
import PatientOrderPanels from '../components/patients/PatientOrderPanels'
import type { PatientCareStatus } from '../types/patient'

export default function PatientDetails() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const canViewClinicalHistory =
    session?.user.role === 'Administrator' || session?.user.role === 'Clinician'
  // A clinician reaches a chart from their queue, not from a directory they cannot open,
  // so "back" has to mean the place they actually came from.
  const back = session?.user.role === 'Receptionist' || session?.user.role === 'Administrator'
    ? { to: '/patients', where: 'patients' }
    : { to: '/dashboard', where: 'dashboard' }

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', tenantId, patientId],
    queryFn: () => getPatient(patientId),
    enabled: Boolean(tenantId && patientId),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tenantId, patientId],
    queryFn: () => getAppointments(patientId),
    enabled: Boolean(tenantId && patientId),
  })
  const encountersQuery = useQuery({
    queryKey: ['encounters', tenantId, patientId],
    queryFn: () => getEncounters(patientId),
    enabled: Boolean(tenantId && patientId && canViewClinicalHistory),
  })

  if (isLoading) return <p className="patient-detail-state">Loading patient...</p>
  if (error || !patient) {
    return (
      <div className="patient-detail-state">
        <p>We couldn’t load this patient.</p>
        <Link to={back.to}>Return to {back.where}</Link>
      </div>
    )
  }

  const fullName = `${patient.firstName} ${patient.lastName}`
  const address = [
    patient.addressLine,
    patient.city,
    patient.district,
    patient.stateProvince,
    patient.country,
  ].filter(Boolean).join(', ')

  return (
    <div className="patient-detail-page">
      <Link className="detail-back-link" to={back.to}>← Back to {back.where}</Link>

      <header className="patient-profile-header">
        <div className="patient-profile-avatar" aria-hidden="true">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>
        <div>
          <p className="patient-record-label">Patient record</p>
          <div className="patient-profile-name">
            <h2>{fullName}</h2>
            <CareStatus status={patient.activeCareStatus} />
          </div>
          <div className="patient-profile-meta">
            <span>{patient.sex || 'Sex not recorded'}</span>
            <span>{patient.dateOfBirth
              ? `Born ${formatDate(patient.dateOfBirth)}`
              : 'Date of birth not recorded'}</span>
            <span>ID: {patient.nationalId || 'Not recorded'}</span>
          </div>
        </div>
        <div className="patient-header-actions">
          {(session?.user.role === 'Receptionist'
            || session?.user.role === 'Administrator')
            && !patient.activeCareStatus && (
            <button className="btn" onClick={() =>
              navigate(`/appointments?patientId=${patient.id}&action=check-in`)}>
              Check in patient
            </button>
          )}
          {(session?.user.role === 'Clinician'
            || session?.user.role === 'Administrator')
            && (patient.activeCareStatus === 'CHECKED_IN'
              || patient.activeCareStatus === 'WAITING') && (
            <button className="btn" onClick={() =>
              navigate(`/appointments?patientId=${patient.id}&action=start-session`)}>
              Start session
            </button>
          )}
          {(session?.user.role === 'Clinician'
            || session?.user.role === 'Administrator')
            && patient.activeCareStatus === 'IN_SESSION' && (
            <button className="btn" onClick={() =>
              navigate(`/records?patientId=${patient.id}`)}>
              Document encounter
            </button>
          )}
        </div>
      </header>

      <div className="patient-summary-grid">
        <section className="detail-card">
          <div className="detail-card-heading">
            <h3>Patient information</h3>
            <span>Quick details</span>
          </div>
          <dl className="patient-detail-list">
            <Detail label="Full name" value={fullName} />
            <Detail label="Date of birth"
              value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
            <Detail label="Sex" value={patient.sex} />
            <Detail label="Government-issued ID" value={patient.nationalId} />
          </dl>
        </section>

        <section className="detail-card">
          <div className="detail-card-heading">
            <h3>Contact & address</h3>
            <span>Quick details</span>
          </div>
          <dl className="patient-detail-list">
            <Detail label="Phone" value={patient.phone} />
            <Detail label="Email" value={patient.email} />
            <Detail label="Address" value={address || null} />
          </dl>
        </section>
      </div>

      <section className="patient-history">
        <div className="history-heading">
          <div>
            <h3>Patient history</h3>
            <p>A timeline of bookings, consultations, prescriptions, and clinical notes.</p>
          </div>
        </div>

        <details className="history-panel" open>
          <summary>
            <span>Appointment history</span>
            <small>{appointmentsQuery.data?.length || 0} recorded</small>
          </summary>
          {appointmentsQuery.data?.length ? (
            <div className="patient-appointment-history">
              {appointmentsQuery.data.map((appointment) => (
                <div key={appointment.id}>
                  <div>
                    <b>{formatStatus(appointment.status)}</b>
                    <small>{[appointment.doctorName, appointment.reason]
                      .filter(Boolean).join(' · ') || 'Walk-in · reason not recorded'}</small>
                  </div>
                  <time>{formatDateTime(appointment.scheduledAt)}</time>
                </div>
              ))}
            </div>
          ) : <div className="history-empty">No appointments recorded.</div>}
        </details>

        {canViewClinicalHistory && (
          <>
            <details className="history-panel">
              <summary>
                <span>Visits & encounters</span>
                <small>{encountersQuery.data?.length || 0} recorded</small>
              </summary>
              {encountersQuery.data?.length ? <div className="patient-appointment-history">
                {encountersQuery.data.map(encounter => <Link
                  to={`/records?encounterId=${encounter.id}`} key={encounter.id}>
                  <div><b>{encounter.diagnosis || encounter.chiefComplaint || 'Draft encounter'}</b>
                    <small>{encounter.clinicianName} · {encounter.status.toLowerCase()}</small></div>
                  <time>{formatDateTime(encounter.finalizedAt || encounter.updatedAt)}</time>
                </Link>)}
              </div> : <div className="history-empty">No clinical encounters recorded.</div>}
            </details>
            <PatientOrderPanels tenantId={tenantId} patientId={patientId} />
            <details className="history-panel">
              <summary>
                <span>Doctor notes</span>
                <small>Restricted clinical information</small>
              </summary>
              {encountersQuery.data?.filter(encounter => encounter.examinationNotes).length
                ? <div className="clinical-note-list">{encountersQuery.data
                  .filter(encounter => encounter.examinationNotes)
                  .map(encounter => <div key={encounter.id}><b>{encounter.clinicianName}</b>
                    <p>{encounter.examinationNotes}</p></div>)}</div>
                : <div className="history-empty">No doctor notes recorded.</div>}
            </details>
          </>
        )}
      </section>
    </div>
  )
}

/** Where the patient is in today's care — the one fact here that changes by the hour. */
function CareStatus({ status }: { status: PatientCareStatus | null }) {
  const labels: Record<PatientCareStatus, string> = {
    CHECKED_IN: 'Checked in',
    WAITING: 'Waiting',
    IN_SESSION: 'In session',
    LAB: 'At the lab',
    PHARMACY: 'Pharmacy',
  }
  // No active status is not a state worth a badge; the check-in button says it better.
  if (!status) return null
  return <span className={`care-status large ${status.toLowerCase()}`}>{labels[status]}</span>
}

function formatStatus(value: string) {
  const words = value.replaceAll('_', ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Not recorded'}</dd>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
