import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { useAuth } from '../auth/AuthContext'
import { navItems } from '../nav'
import DateChip from './DateChip'
import Logo from './Logo'
import PasswordChangeModal from './PasswordChangeModal'

export default function DashboardLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [changingPassword, setChangingPassword] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountMenu = useRef<HTMLDivElement>(null)

  const tenant = session?.tenant

  // Apply the hospital's brand color. The whole ramp is derived from the one colour they
  // chose — setting --brand alone left every tint and hover state the default teal.
  useEffect(() => {
    const colour = tenant?.primaryColor
    const root = document.documentElement
    const ramp = {
      '--brand': colour,
      '--brand-dark': `color-mix(in srgb, ${colour} 82%, black)`,
      '--brand-light': `color-mix(in srgb, ${colour} 62%, white)`,
      '--brand-bg': `color-mix(in srgb, ${colour} 8%, white)`,
    }
    if (colour) Object.entries(ramp).forEach(([name, value]) => root.style.setProperty(name, value!))
    return () => Object.keys(ramp).forEach(name => root.style.removeProperty(name))
  }, [tenant?.primaryColor])

  // Two gates: the user's role must allow it AND (if it's a subscription
  // module) the hospital's plan must have it enabled.
  const items = navItems.filter((item) => {
    if (!session) return false
    if (!item.roles.includes(session.user.role)) return false
    if (item.moduleKey && !tenant?.enabledModules.includes(item.moduleKey)) return false
    return true
  })

  // The topbar names where you are; the sidebar already carries the branding.
  const section = pathname.startsWith('/profile') ? 'Your profile'
    : items.find((item) => pathname.startsWith(item.to))?.label ?? 'Dashboard'

  useEffect(() => {
    function closeAccount(event: MouseEvent) {
      if (!accountMenu.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeAccount)
    return () => document.removeEventListener('mousedown', closeAccount)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* The product's own mark always shows; the clinic's name rides beside it. */}
        <div className="brand">
          <Logo />
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

        <div className="sidebar-footer">
          <button type="button" className="sign-out" onClick={handleLogout}>
            <span className="icon"><LogoutOutlinedIcon fontSize="small" /></span>
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="page-title">{section}</div>
          <div className="user">
            <DateChip />
            <div className="account-menu" ref={accountMenu}>
              <button type="button" className="account-trigger" aria-haspopup="menu"
                aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
                <div className="user-meta">
                  <div className="name">{session?.user.name}</div>
                  <div className="role">{session?.user.role}</div>
                </div>
                <div className="avatar">
                  {session?.user.profileImage
                    ? <img src={session.user.profileImage} alt="" />
                    : session?.user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <KeyboardArrowDownIcon className={accountOpen ? 'open' : ''} fontSize="small" />
              </button>
              {accountOpen && (
                <div className="account-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={() => {
                    setAccountOpen(false); navigate('/profile')
                  }}><AccountCircleOutlinedIcon fontSize="small" /> View profile</button>
                  <button type="button" role="menuitem" onClick={() => {
                    setAccountOpen(false); setChangingPassword(true)
                  }}><LockResetOutlinedIcon fontSize="small" /> Change password</button>
                  <button type="button" role="menuitem" className="danger" onClick={handleLogout}>
                    <LogoutOutlinedIcon fontSize="small" /> Log out
                  </button>
                </div>
              )}
            </div>
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
