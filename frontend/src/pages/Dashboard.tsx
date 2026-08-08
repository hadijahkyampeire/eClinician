import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/stats'
import { useAuth, type Role } from '../auth/AuthContext'
import type { DashboardStats } from '../types/stats'

// One dashboard entry point that renders a different view per role, so each
// demo login lands somewhere distinct. Counts come from /api/stats/dashboard.

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

type View = {
  title: string
  blurb: string
  stats: (s: DashboardStats) => [string, number][]
  note: string
}

const VIEWS: Record<Role, View> = {
  Administrator: {
    title: 'Administrator Dashboard',
    blurb: 'Facility overview and staff activity',
    stats: (s) => [['Total Patients', s.totalPatients], ['Appointments Today', s.appointmentsToday], ['Open Encounters', s.draftEncounters], ['Clinicians Documenting', s.clinicians]],
    note: 'Staff management and per-tenant subscription controls are next up.',
  },
  Clinician: {
    title: 'Clinician Dashboard',
    blurb: 'Your schedule and clinical tasks',
    stats: (s) => [['Waiting Now', s.waiting], ['In Session', s.inSession], ['Open Encounters', s.draftEncounters], ['Finalized Today', s.finalizedToday]],
    note: 'Start a session from Appointments, then document the encounter under Records.',
  },
  Receptionist: {
    title: 'Front Desk Dashboard',
    blurb: 'Registrations and appointments',
    stats: (s) => [['Checked In', s.checkedIn], ['Waiting', s.waiting], ['Appointments Today', s.appointmentsToday], ['Registered Today', s.newPatientsToday]],
    note: 'Register a patient under Patients, then check them in to start their visit.',
  },
  Pharmacist: {
    title: 'Pharmacy Dashboard',
    blurb: 'Prescriptions raised by clinicians',
    stats: (s) => [['Prescriptions Raised', s.prescriptionsRaised], ['Finalized Today', s.finalizedToday], ['In Session', s.inSession], ['Total Patients', s.totalPatients]],
    note: 'Prescriptions are currently recorded on the encounter. Dispensing is a planned module.',
  },
  'Lab Technician': {
    title: 'Laboratory Dashboard',
    blurb: 'Lab requests raised by clinicians',
    stats: (s) => [['Lab Requests Raised', s.labRequestsRaised], ['Finalized Today', s.finalizedToday], ['In Session', s.inSession], ['Waiting', s.waiting]],
    note: 'Lab requests are currently recorded on the encounter. Result entry is a planned module.',
  },
}

export default function Dashboard() {
  const { session } = useAuth()
  const role = session?.user.role ?? 'Clinician'
  const view = VIEWS[role]
  const tenantId = session?.tenant?.id

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: () => getDashboardStats(tenantId!),
    enabled: Boolean(tenantId),
  })

  // Labels stay visible while loading so the layout doesn't jump.
  const stats = data ? view.stats(data) : view.stats(EMPTY)

  return (
    <>
      <div className="page-header">
        <h2>{view.title}</h2>
        <p>Welcome back, {session?.user.name} · {view.blurb}</p>
      </div>

      {error && <div className="card placeholder">Could not reach the API. Is the backend running?</div>}

      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <Stat key={label} label={label} value={isLoading || error ? '—' : String(value)} />
        ))}
      </div>

      <div className="card placeholder">
        {view.note} <Link to="/patients">Go to Patients</Link>
      </div>
    </>
  )
}

const EMPTY: DashboardStats = {
  totalPatients: 0, newPatientsToday: 0, checkedIn: 0, waiting: 0, inSession: 0,
  appointmentsToday: 0, draftEncounters: 0, finalizedToday: 0, clinicians: 0,
  prescriptionsRaised: 0, labRequestsRaised: 0,
}
