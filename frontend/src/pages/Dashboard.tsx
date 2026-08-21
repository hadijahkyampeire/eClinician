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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { getDashboardStats } from '../api/stats'
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
  next: { note: string; to: string; action: string }
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
    next: { note: 'Add a colleague or change what your clinic looks like.', to: '/staff', action: 'Manage staff' },
  },
  Clinician: {
    title: 'Clinician Dashboard',
    blurb: 'Your schedule and clinical tasks',
    tiles: [
      { label: 'Waiting Now', read: s => s.waiting, icon: <HourglassEmptyOutlinedIcon />, to: '/appointments' },
      { label: 'In Session', read: s => s.inSession, icon: <StethoscopeIcon />, to: '/appointments' },
      { label: 'Open Encounters', read: s => s.draftEncounters, icon: <DescriptionOutlinedIcon />, to: '/records' },
      { label: 'Finalized Today', read: s => s.finalizedToday, icon: <TaskAltOutlinedIcon />, to: '/records' },
    ],
    next: { note: 'Take the next patient into session, then document the visit under Records.', to: '/appointments', action: 'Open appointments' },
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
    next: { note: 'Register a patient, then check them in to start their visit.', to: '/patients', action: 'Go to patients' },
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
    next: { note: 'Every medicine on a finalized visit becomes its own row in the queue.', to: '/pharmacy', action: 'Open the queue' },
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
    next: { note: 'Record a result against the test that was requested, or cancel it with a reason.', to: '/laboratory', action: 'Open the queue' },
  },
}

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

  // Labels stay visible while loading so the layout doesn't jump.
  const reading = (tile: Tile) =>
    isLoading || error || !data ? '—' : String(tile.read(data))

  return (
    <>
      <div className="page-header">
        <h2>{view.title}</h2>
        <p>Welcome back, {session?.user.name?.split(' ')[0]} · {view.blurb}</p>
      </div>

      {error && (
        <div className="card notice error">Could not reach the API. Is the backend running?</div>
      )}

      <div className="stat-grid">
        {view.tiles.map(tile => (
          <Stat key={tile.label} tile={tile} value={reading(tile)} />
        ))}
      </div>

      <div className="card next-step">
        <div>
          <h3>What happens next</h3>
          <p>{view.next.note}</p>
        </div>
        <Link to={view.next.to} className="btn">
          {view.next.action} <ArrowForwardIcon fontSize="small" />
        </Link>
      </div>
    </>
  )
}
