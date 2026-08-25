import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { platformNav } from '../../platformNav'
import AccountMenu from '../AccountMenu'
import DateChip from '../DateChip'
import Logo from '../Logo'
import SidebarSignOut from '../SidebarSignOut'
import { useBrandRamp } from '../useBrandRamp'

/**
 * The console's own shell. It reuses the clinical layout's chrome so the product stays one
 * product, but takes the house navy as its accent: no hospital is signed in here, and the
 * operator should be able to tell at a glance that they are above the clinics, not inside
 * one. The mark is the same mark, drawn in that colour.
 */
export default function PlatformLayout() {
  const { session } = useAuth()
  const { pathname } = useLocation()

  useBrandRamp('#0f766e', 'var(--navy)')

  const current = [...platformNav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => item.end ? pathname === item.to : pathname.startsWith(item.to))

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div className="brand-names">
            <span className="brand-product">HK CLINIC</span>
            <span className="brand-tenant">Platform console</span>
          </div>
        </div>

        <nav className="nav">
          {platformNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
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
          <div className="page-title">
            {current?.label ?? 'Overview'}
            <small>{session?.user.name} · every hospital on the platform</small>
          </div>
          <div className="user">
            <DateChip />
            <AccountMenu subtitle="Platform Super Admin" profilePath="/admin/profile" />
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
