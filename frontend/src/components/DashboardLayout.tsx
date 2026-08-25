import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { ButtonBase, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import { navItems } from '../nav'
import { DEPARTMENTS } from './dashboard/departments'
import DateChip from './DateChip'
import Logo from './Logo'
import PasswordChangeModal from './PasswordChangeModal'

export default function DashboardLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [changingPassword, setChangingPassword] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)

  const tenant = session?.tenant

  // Two things decide what colour this session is drawn in: the hospital the user belongs
  // to, and the department they work in. Both ramps are set on the root rather than on the
  // layout, because --dept is *computed* from --brand at :root, and a value overridden
  // further down the tree would never reach that computation.
  //
  // --dept is the department pulled a quarter of the way towards the hospital's colour, so
  // every accent carries both: the pharmacist's screens are green, and a hospital branded
  // purple turns all five departments purple-ward on their next sign-in.
  const colour = tenant?.primaryColor
  const accent = session ? DEPARTMENTS[session.user.role].accent : undefined

  useEffect(() => {
    const root = document.documentElement
    const dept = accent && `color-mix(in srgb, ${accent} 78%, ${colour ?? 'var(--teal)'})`
    const ramp: Record<string, string | undefined> = {
      '--brand': colour,
      '--brand-dark': colour && `color-mix(in srgb, ${colour} 82%, black)`,
      '--brand-light': colour && `color-mix(in srgb, ${colour} 62%, white)`,
      '--brand-bg': colour && `color-mix(in srgb, ${colour} 8%, white)`,
      '--dept': dept,
      '--dept-dark': dept && `color-mix(in srgb, ${dept} 80%, black)`,
      '--dept-light': dept && `color-mix(in srgb, ${dept} 62%, white)`,
      '--dept-bg': dept && `color-mix(in srgb, ${dept} 12%, white)`,
    }
    Object.entries(ramp).forEach(([name, value]) => value && root.style.setProperty(name, value))
    return () => Object.keys(ramp).forEach(name => root.style.removeProperty(name))
  }, [colour, accent])

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

  function handleLogout() {
    setAccountAnchor(null)
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
            <div className="account-menu">
              <ButtonBase className="account-trigger" aria-haspopup="menu"
                aria-controls={accountAnchor ? 'account-menu' : undefined}
                aria-expanded={Boolean(accountAnchor)}
                onClick={event => setAccountAnchor(event.currentTarget)}>
                <div className="user-meta">
                  <div className="name">{session?.user.name}</div>
                  <div className="role">{session?.user.role}</div>
                </div>
                <div className="avatar">
                  {session?.user.profileImage
                    ? <img src={session.user.profileImage} alt="" />
                    : session?.user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <KeyboardArrowDownIcon className={accountAnchor ? 'open' : ''} fontSize="small" />
              </ButtonBase>
              <Menu id="account-menu" anchorEl={accountAnchor} open={Boolean(accountAnchor)}
                onClose={() => setAccountAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } },
                  list: { 'aria-label': 'Account options', sx: { py: 0.75 } },
                }}>
                <MenuItem onClick={() => {
                  setAccountAnchor(null); navigate('/profile')
                }}>
                  <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>View profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  setAccountAnchor(null); setChangingPassword(true)
                }}>
                  <ListItemIcon><LockResetOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Change password</ListItemText>
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main',
                  '& .MuiListItemIcon-root': { color: 'inherit' } }}>
                  <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Log out</ListItemText>
                </MenuItem>
              </Menu>
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
