import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItems } from '../nav'
import PasswordChangeModal from './PasswordChangeModal'

export default function DashboardLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)

  const tenant = session?.tenant

  // Apply the hospital's brand color to the CSS variable everything reads from.
  useEffect(() => {
    if (tenant?.primaryColor) {
      document.documentElement.style.setProperty('--brand', tenant.primaryColor)
    }
    return () => {
      document.documentElement.style.removeProperty('--brand')
    }
  }, [tenant?.primaryColor])

  // Two gates: the user's role must allow it AND (if it's a subscription
  // module) the hospital's plan must have it enabled.
  const items = navItems.filter((item) => {
    if (!session) return false
    if (!item.roles.includes(session.user.role)) return false
    if (item.moduleKey && !tenant?.enabledModules.includes(item.moduleKey)) return false
    return true
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* The product's own mark always shows; the clinic's name rides beside it. */}
        <div className="brand">
          <div className="logo">HK</div>
          <div className="brand-names">
            <span className="brand-product">HK CLINIC</span>
            {tenant?.name && <span className="brand-tenant">{tenant.name}</span>}
          </div>
        </div>

        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="spacer" />
        <button className="btn ghost" onClick={() => setChangingPassword(true)}>
          Change password
        </button>
        <button className="btn ghost" onClick={handleLogout}>Log out</button>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="page-title">
            HK CLINIC{tenant?.name ? ` · ${tenant.name}` : ''}
          </div>
          <div className="user">
            <div className="user-meta">
              <div className="name">{session?.user.name}</div>
              <div className="role">{session?.user.role}</div>
            </div>
            <div className="avatar">{session?.user.name?.[0]?.toUpperCase() ?? '?'}</div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
        {changingPassword && (
          <PasswordChangeModal onClose={() => setChangingPassword(false)} />
        )}
      </div>
    </div>
  )
}
