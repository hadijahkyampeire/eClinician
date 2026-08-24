import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import StethoscopeIcon from '@mui/icons-material/MonitorHeartOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import { getDashboardStats } from '../api/stats'
import {
  BookedToday, InTheClinic, PendingMedicines, PendingTests, UnfinishedNotes,
} from '../components/dashboard/panels'
import { useAuth, type Role } from '../auth/AuthContext'
import type { DashboardStats } from '../types/stats'

// One dashboard entry point that renders a different view per role, so each login
// lands somewhere distinct. Counts come from /api/stats/dashboard.

type Tile = {
  label: string
  read: (s: DashboardStats) => number
  icon: ReactNode
  /** Where the number came from, so a tile is a way in rather than a decoration. */
  to?: string
}

type View = {
  title: string
  blurb: string
  tiles: Tile[]
  /** The work itself, under the counts — every role gets the list its number stands for. */
  panels: ReactNode
  /** The one thing this role opens the dashboard to do, always in reach. */
  action?: { label: string; to: string }
}

const VIEWS: Record<Role, View> = {
  Administrator: {
    title: 'Administrator Dashboard',
    blurb: 'Facility overview and staff activity',
    tiles: [
      { label: 'Total Patients', read: s => s.totalPatients, icon: <GroupsOutlinedIcon />, to: '/patients' },
      { label: 'Appointments Today', read: s => s.appointmentsToday, icon: <CalendarMonthOutlinedIcon />, to: '/appointments' },
      { label: 'Open Encounters', read: s => s.draftEncounters, icon: <DescriptionOutlinedIcon />, to: '/records' },
      { label: 'Clinicians Documenting', read: s => s.clinicians, icon: <StethoscopeIcon />, to: '/staff' },
    ],
    panels: <>
      <InTheClinic first={{ label: 'See the appointment book', to: '/appointments' }} />
      <UnfinishedNotes readOnly />
    </>,
  },
  Clinician: {
    title: 'Clinician Dashboard',
    blurb: 'Your schedule and clinical tasks',
    tiles: [
      // Everyone in the building who is not yet in session — a clinician does not care
      // whether the front desk has walked them to the waiting room yet.
      { label: 'Waiting Now', read: s => s.checkedIn + s.waiting, icon: <HourglassEmptyOutlinedIcon />, to: '/appointments' },
      { label: 'In Session', read: s => s.inSession, icon: <StethoscopeIcon />, to: '/appointments' },
      { label: 'Open Encounters', read: s => s.draftEncounters, icon: <DescriptionOutlinedIcon />, to: '/records' },
      { label: 'Finalized Today', read: s => s.finalizedToday, icon: <TaskAltOutlinedIcon />, to: '/records' },
    ],
    panels: <>
      <InTheClinic act="start-session" first={{ label: 'See who is booked today', to: '/appointments' }} />
      <UnfinishedNotes />
    </>,
  },
  Receptionist: {
    title: 'Front Desk Dashboard',
    blurb: 'Registrations and appointments',
    tiles: [
      { label: 'Checked In', read: s => s.checkedIn, icon: <HowToRegOutlinedIcon />, to: '/appointments' },
      { label: 'Waiting', read: s => s.waiting, icon: <HourglassEmptyOutlinedIcon />, to: '/appointments' },
      { label: 'Appointments Today', read: s => s.appointmentsToday, icon: <CalendarMonthOutlinedIcon />, to: '/appointments' },
      { label: 'Registered Today', read: s => s.newPatientsToday, icon: <GroupsOutlinedIcon />, to: '/patients' },
    ],
    panels: <>
      <InTheClinic act="to-room" first={{ label: 'Register or check in a patient', to: '/patients' }} />
      <BookedToday />
    </>,
    action: { label: 'Register a patient', to: '/patients' },
  },
  Pharmacist: {
    title: 'Pharmacy Dashboard',
    blurb: 'Dispensing queue',
    tiles: [
      { label: 'Pending', read: s => s.prescriptionsPending, icon: <MedicationOutlinedIcon />, to: '/pharmacy' },
      { label: 'Dispensed Today', read: s => s.prescriptionsDispensedToday, icon: <TaskAltOutlinedIcon />, to: '/pharmacy' },
      { label: 'Unavailable', read: s => s.prescriptionsUnavailable, icon: <BlockOutlinedIcon />, to: '/pharmacy' },
      { label: 'Finalized Today', read: s => s.finalizedToday, icon: <DescriptionOutlinedIcon /> },
    ],
    panels: <PendingMedicines />,
  },
  'Lab Technician': {
    title: 'Laboratory Dashboard',
    blurb: 'Tests requested by clinicians',
    tiles: [
      { label: 'Pending Tests', read: s => s.labPending, icon: <ScienceOutlinedIcon />, to: '/laboratory' },
      { label: 'Resulted Today', read: s => s.labResultedToday, icon: <TaskAltOutlinedIcon />, to: '/laboratory' },
      { label: 'Cancelled', read: s => s.labCancelled, icon: <BlockOutlinedIcon />, to: '/laboratory' },
      { label: 'Finalized Today', read: s => s.finalizedToday, icon: <DescriptionOutlinedIcon /> },
    ],
    panels: <PendingTests />,
  },
}

// Names are stored with their title, and "Welcome back, Dr." greets nobody.
const firstName = (name?: string) =>
  name?.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').split(' ')[0]

function Stat({ tile, value }: { tile: Tile; value: string }) {
  const body = (
    <>
      <span className="stat-icon">{tile.icon}</span>
      <span className="label">{tile.label}</span>
      <span className="value">{value}</span>
    </>
  )
  return tile.to
    ? <Link to={tile.to} className="stat-card linked">{body}</Link>
    : <div className="stat-card">{body}</div>
}

export default function Dashboard() {
  const { session } = useAuth()
  const role = session?.user.role ?? 'Clinician'
  const view = VIEWS[role]
  const tenantId = session?.tenant?.id

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: () => getDashboardStats(),
    enabled: Boolean(tenantId),
  })

  // An ended session says so for itself; anything else really is the API being out of
  // reach. Reporting the first as the second is what sent everyone looking at the server.
  const dashboardError = error?.message.match(/session has ended/i)
    ? error.message
    : 'Could not reach the API. Is the backend running?'

  // Labels stay visible while loading so the layout doesn't jump.
  const reading = (tile: Tile) =>
    isLoading || error || !data ? '—' : String(tile.read(data))

  return (
    <>
      <div className="page-header appointment-page-header">
        <div>
          <h2>{view.title}</h2>
          <p>Welcome back, {firstName(session?.user.name)} · {view.blurb}</p>
        </div>
        {view.action && <Link className="btn" to={view.action.to}>{view.action.label}</Link>}
      </div>

      {error && (
        <div className="card notice error">{dashboardError}</div>
      )}

      <div className="stat-grid">
        {view.tiles.map(tile => (
          <Stat key={tile.label} tile={tile} value={reading(tile)} />
        ))}
      </div>

      <div className="panel-grid">{view.panels}</div>
    </>
  )
}
