import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** A count that is also a way in: every tile on the console opens the screen behind it. */
export default function StatTile({ label, value, icon, to }: {
  label: string
  value: number | undefined
  icon: ReactNode
  to: string
}) {
  return (
    <Link className="stat-card linked" to={to}>
      <span className="stat-icon">{icon}</span>
      <span className="label">{label}</span>
      <span className="value">{value ?? '—'}</span>
    </Link>
  )
}
