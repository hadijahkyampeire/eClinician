import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as requestLogin } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { demoUsers, tenantById } from '../auth/demoUsers'
import type { Role } from '../auth/AuthContext'

// The seeded demo accounts all share this password (see UserSeeder on the API).
const DEMO_PASSWORD = 'demo1234'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = email.trim() !== '' && password.trim() !== '' && !busy

  // Picking a demo role prepopulates the fields (which enables the button).
  function handleDemoSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const demo = demoUsers.find((u) => u.id === e.target.value)
    if (!demo) {
      setEmail('')
      setPassword('')
      return
    }
    setEmail(demo.session.user.email)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await requestLogin(email.trim(), password)
      login(
        {
          user: { name: result.name, email: result.email, role: result.role as Role },
          isPlatformAdmin: result.platformAdmin,
          tenant: tenantById(result.tenantId),
        },
        result.token,
      )
      navigate(result.platformAdmin ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand">
          <div className="logo">e</div>
          <h1>eClinician</h1>
        </div>
        <p className="subtitle">Sign in to your clinical workspace</p>

        <div className="field">
          <label>Email or Hospital ID</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.eclinician.com"
            autoComplete="username"
          />
        </div>

        <div className="field">
          <div className="field-row">
            <label>Password</label>
            <a className="forgot" href="#">Forgot password?</a>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn block" disabled={!canSubmit}>
          Sign in →
        </button>

        <div className="divider"><span>Demo access</span></div>

        <div className="field">
          <label>Sign in as (demo)</label>
          <select defaultValue="" onChange={handleDemoSelect}>
            <option value="" disabled>Choose a role…</option>
            {demoUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
        <p className="demo-hint">
          Selecting a role fills in its credentials — then press <strong>Sign in</strong>.
        </p>
      </form>
    </div>
  )
}
