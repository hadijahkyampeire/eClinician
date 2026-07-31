import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getPatient } from '../api/patients'
import { getAppointments } from '../api/appointments'

export default function PatientDetails() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const canViewClinicalHistory =
    session?.user.role === 'Administrator' || session?.user.role === 'Clinician'

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', tenantId, patientId],
    queryFn: () => getPatient(tenantId!, patientId),
    enabled: Boolean(tenantId && patientId),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tenantId, patientId],
    queryFn: () => getAppointments(tenantId!, patientId),
    enabled: Boolean(tenantId && patientId),
  })

  if (isLoading) return <p className="patient-detail-state">Loading patient...</p>
  if (error || !patient) {
    return (
      <div className="patient-detail-state">
        <p>We couldn’t load this patient.</p>
        <Link to="/patients">Return to patients</Link>
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
      <Link className="detail-back-link" to="/patients">← Back to patients</Link>

      <header className="patient-profile-header">
        <div className="patient-profile-avatar" aria-hidden="true">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>
        <div>
          <p className="patient-record-label">Patient record</p>
          <h2>{fullName}</h2>
          <div className="patient-profile-meta">
            <span>{patient.sex || 'Sex not recorded'}</span>
            <span>{patient.dateOfBirth
              ? `Born ${formatDate(patient.dateOfBirth)}`
              : 'Date of birth not recorded'}</span>
            <span>ID: {patient.nationalId || 'Not recorded'}</span>
            <span>Current status: {patient.activeCareStatus
              ? patient.activeCareStatus.replaceAll('_', ' ').toLowerCase()
              : 'None'}</span>
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
            <p>Appointments, visits, and clinical information will appear here.</p>
          </div>
        </div>

        <details className="history-panel" open>
          <summary>
            <span>Appointments</span>
            <small>{appointmentsQuery.data?.length || 0} recorded</small>
          </summary>
          {appointmentsQuery.data?.length ? (
            <div className="patient-appointment-history">
              {appointmentsQuery.data.map((appointment) => (
                <div key={appointment.id}>
                  <div>
                    <b>{appointment.status.replaceAll('_', ' ').toLowerCase()}</b>
                    <small>{appointment.reason || 'No reason recorded'}</small>
                  </div>
                  <time>{formatDateTime(appointment.scheduledAt)}</time>
                </div>
              ))}
            </div>
          ) : <div className="history-empty">No appointments recorded.</div>}
        </details>

        {canViewClinicalHistory ? (
          <>
            <details className="history-panel">
              <summary>
                <span>Visits & encounters</span>
                <small>No visits recorded</small>
              </summary>
              <div className="history-empty">
                Consultation and encounter history will appear here.
              </div>
            </details>
            <details className="history-panel">
              <summary>
                <span>Doctor notes</span>
                <small>Restricted clinical information</small>
              </summary>
              <div className="history-empty">
                Clinical notes will only be visible to roles with explicit permission.
              </div>
            </details>
          </>
        ) : (
          <div className="restricted-panel">
            Clinical history and doctor notes are restricted for your role.
          </div>
        )}
      </section>
    </div>
  )
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
