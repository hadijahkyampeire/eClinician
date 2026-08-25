import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { navItems } from '../nav'
import { DEPARTMENTS } from './dashboard/departments'
import AccountMenu from './AccountMenu'
import DateChip from './DateChip'
import Logo from './Logo'
import { useBrandRamp } from './useBrandRamp'
import SidebarSignOut from './SidebarSignOut'

export default function DashboardLayout() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const tenant = session?.tenant

  // Two things decide what colour this session is drawn in: the hospital the user belongs
  // to, and the department they work in — the department pulled a quarter of the way
  // towards the hospital's colour, so every accent carries both.
  useBrandRamp(tenant?.primaryColor,
    session ? DEPARTMENTS[session.user.role].accent : undefined)

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
        <SidebarSignOut />
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="page-title">{section}</div>
          <div className="user">
            <DateChip />
            <AccountMenu profilePath="/profile" />
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
