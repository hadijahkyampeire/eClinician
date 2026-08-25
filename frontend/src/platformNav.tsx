import type { ReactNode } from 'react'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'

export interface PlatformNavItem {
  to: string
  label: string
  icon: ReactNode
  /** Only the overview matches exactly; the rest own everything beneath them. */
  end?: boolean
}

/**
 * The platform console's own navigation. It deliberately has no clinical destinations:
 * the operator runs the platform, and the two directories they can reach are read-only.
 */
export const platformNav: PlatformNavItem[] = [
  { to: '/admin', label: 'Overview', end: true, icon: <InsightsOutlinedIcon fontSize="small" /> },
  { to: '/admin/hospitals', label: 'Hospitals', icon: <LocalHospitalOutlinedIcon fontSize="small" /> },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: <WorkspacePremiumOutlinedIcon fontSize="small" /> },
  { to: '/admin/staff', label: 'Staff', icon: <BadgeOutlinedIcon fontSize="small" /> },
  { to: '/admin/patients', label: 'Patients', icon: <GroupsOutlinedIcon fontSize="small" /> },
]
