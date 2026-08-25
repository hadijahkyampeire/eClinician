import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as requestLogin } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../auth/AuthContext'
import Logo from '../components/Logo'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { login, expiredNotice, dismissNotice } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = email.trim() !== '' && password.trim() !== '' && !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    dismissNotice()
    try {
      const result = await requestLogin(email.trim(), password)
      login(
        {
          user: { name: result.name, email: result.email, role: result.role as Role,
            profileImage: result.profileImage },
          isPlatformAdmin: result.platformAdmin,
          tenant: result.tenant,
        },
        {
          token: result.token,
          refreshToken: result.refreshToken,
          expiresInSeconds: result.expiresInSeconds,
        },
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
        {/* The same mark, wordmark and second line as the sidebar, so signing in does not
            hand you a differently-branded product than the one behind it. */}
        <div className="brand">
          <Logo size={44} />
          <div className="brand-names">
            <span className="brand-product">HK CLINIC</span>
            <span className="brand-tenant">Clinical Management System</span>
          </div>
        </div>
        <p className="subtitle">Sign in to continue</p>

        {expiredNotice && !error && (
          <p className="form-error" role="status">
            Your session ended, so you were signed out. Sign in to pick up where you were.
          </p>
        )}

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
            <span className="forgot" title="No self-service reset yet — see the roadmap">
              Forgotten? Ask your administrator
            </span>
          </div>
          <PasswordInput
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

        <p className="demo-hint">
          Your account decides what you can open — the server reads the role and answers
          with it. There is nothing to choose here.
        </p>
      </form>
    </div>
  )
}
