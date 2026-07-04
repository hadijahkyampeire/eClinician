import type { ReactNode } from 'react'
import type { Role, ModuleKey } from './auth/AuthContext'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'

export interface NavItem {
  to: string
  label: string
  roles: Role[]
  icon: ReactNode
  // Modules can be turned on/off per hospital subscription. Items without a
  // moduleKey (Dashboard, Staff) are always available to their allowed roles.
  moduleKey?: ModuleKey
}

export const navItems: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',    roles: ['Administrator', 'Clinician', 'Receptionist', 'Pharmacist', 'Lab Technician'], icon: <DashboardOutlinedIcon fontSize="small" /> },
  { to: '/patients',     label: 'Patients',     roles: ['Administrator', 'Clinician', 'Receptionist'], moduleKey: 'patients',     icon: <GroupsOutlinedIcon fontSize="small" /> },
  { to: '/appointments', label: 'Appointments', roles: ['Administrator', 'Clinician', 'Receptionist'], moduleKey: 'appointments', icon: <CalendarMonthOutlinedIcon fontSize="small" /> },
  { to: '/records',      label: 'Records',      roles: ['Administrator', 'Clinician'],                 moduleKey: 'records',      icon: <DescriptionOutlinedIcon fontSize="small" /> },
  { to: '/pharmacy',     label: 'Pharmacy',     roles: ['Administrator', 'Clinician', 'Pharmacist'],   moduleKey: 'pharmacy',     icon: <MedicationOutlinedIcon fontSize="small" /> },
  { to: '/laboratory',   label: 'Lab Results',  roles: ['Administrator', 'Clinician', 'Lab Technician'], moduleKey: 'laboratory', icon: <ScienceOutlinedIcon fontSize="small" /> },
  { to: '/staff',        label: 'Staff',        roles: ['Administrator'],                               icon: <BadgeOutlinedIcon fontSize="small" /> },
]
