import { useAuth, type Role } from '../auth/AuthContext'

// One dashboard entry point that renders a different view per role, so each
// demo login lands somewhere distinct. TODO (backend): replace the hardcoded
// numbers with data fetched for the current tenant.

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

const VIEWS: Record<Role, { title: string; blurb: string; stats: [string, string][] }> = {
  Administrator: {
    title: 'Administrator Dashboard',
    blurb: 'Facility overview and staff activity',
    stats: [['Total Patients', '0'], ['Active Clinicians', '0'], ['Appointments Today', '0'], ['Pending Lab Requests', '0']],
  },
  Clinician: {
    title: 'Clinician Dashboard',
    blurb: 'Your schedule and clinical tasks',
    stats: [['Patients Today', '0'], ['Urgent Tasks', '0'], ['Pending Results', '0'], ['Avg Wait (min)', '0']],
  },
  Receptionist: {
    title: 'Front Desk Dashboard',
    blurb: 'Registrations and appointments',
    stats: [['Checked In', '0'], ["Today's Appointments", '0'], ['New Registrations', '0'], ['Waiting', '0']],
  },
  Pharmacist: {
    title: 'Pharmacy Dashboard',
    blurb: 'Prescriptions to review and dispense',
    stats: [['Pending Prescriptions', '0'], ['Dispensed Today', '0'], ['Low Stock Items', '0'], ['Flagged', '0']],
  },
  'Lab Technician': {
    title: 'Laboratory Dashboard',
    blurb: 'Lab requests and results',
    stats: [['Pending Requests', '0'], ['In Progress', '0'], ['Completed Today', '0'], ['Critical', '0']],
  },
}

export default function Dashboard() {
  const { session } = useAuth()
  const role = session?.user.role ?? 'Clinician'
  const view = VIEWS[role]

  return (
    <>
      <div className="page-header">
        <h2>{view.title}</h2>
        <p>Welcome back, {session?.user.name} · {view.blurb}</p>
      </div>

      <div className="stat-grid">
        {view.stats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>

      <div className="card placeholder">
        Build the {role} activity view here.
      </div>
    </>
  )
}
