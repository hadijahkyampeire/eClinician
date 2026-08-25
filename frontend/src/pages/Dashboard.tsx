import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/stats'
import { VIEWS, type Tile } from '../components/dashboard/views'
import { DEPARTMENTS } from '../components/dashboard/departments'
import { useAuth } from '../auth/AuthContext'

// One dashboard entry point that renders a different view per role, so each login lands in
// a different part of the clinic — its own crest and layout. Counts come from
// /api/stats/dashboard. The department's colour is set on the layout, not here, so the
// sidebar and topbar wear it too rather than the page disagreeing with its own chrome.

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
  const department = DEPARTMENTS[role]
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

  const tiles = <div className="stat-grid">
    {view.tiles.map(tile => <Stat key={tile.label} tile={tile} value={reading(tile)} />)}
  </div>

  return (
    <div className={`dash dash-${view.layout}`}>
      <header className="dash-hero">
        <span className="dash-crest">{view.crest}</span>
        <div className="dash-headings">
          <span className="dash-department">{department.name}</span>
          <h2>{view.title}</h2>
          <p>Welcome back, {firstName(session?.user.name)} · {view.blurb}</p>
        </div>
        {view.action && <Link className="btn dash-action" to={view.action.to}>{view.action.label}</Link>}
      </header>

      {error && <div className="card notice error">{dashboardError}</div>}

      <div className="dash-body">
        {tiles}
        <div className="panel-grid">{view.panels}</div>
      </div>

      {view.lookback}
    </div>
  )
}
