import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Placeholder super-admin landing. TODO: real console — onboard hospitals,
// manage subscriptions (toggle modules per tenant), billing, system health.
export default function PlatformAdmin() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>eClinician Admin — System Oversight</h2>
          <p>Signed in as {session?.user.name} (Platform Super Admin)</p>
        </div>
        <button className="btn ghost" onClick={handleLogout}>Log out</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="label">Total Hospitals</div><div className="value">0</div></div>
        <div className="stat-card"><div className="label">Active Hospitals</div><div className="value">0</div></div>
        <div className="stat-card"><div className="label">Platform Users</div><div className="value">0</div></div>
      </div>

      <div className="card placeholder">
        TODO: hospitals list, onboarding wizard, per-tenant module toggles, billing.
      </div>
    </div>
  )
}
