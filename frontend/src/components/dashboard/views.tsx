import type { ReactNode } from 'react'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import StethoscopeIcon from '@mui/icons-material/MonitorHeartOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import LocalPharmacyOutlinedIcon from '@mui/icons-material/LocalPharmacyOutlined'
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import {
  InTheClinic, PendingMedicines, PendingTests, UnfinishedNotes,
} from './panels'
import {
  AppointmentsLookback, LabLookback, PharmacyLookback, VisitsLookback,
} from './lookbacks'
import type { Role } from '../../auth/AuthContext'
import type { DashboardStats } from '../../types/stats'

export type Tile = {
  label: string
  read: (s: DashboardStats) => number
  icon: ReactNode
  /** Where the number came from, so a tile is a way in rather than a decoration. */
  to?: string
}

export type View = {
  title: string
  blurb: string
  crest: ReactNode
  /**
   * `counters` reads left to right: several numbers, then the lists under them.
   * `bench` is one queue worked all day, with its counters in a rail beside it.
   */
  layout: 'counters' | 'bench'
  tiles: Tile[]
  /** The work itself, under the counts — every role gets the list its number stands for. */
  panels: ReactNode
  /** The same window control for every role, over whatever their own history is. */
  lookback: ReactNode
  /** The one thing this role opens the dashboard to do, always in reach. */
  action?: { label: string; to: string }
}

export const VIEWS: Record<Role, View> = {
  Receptionist: {
    title: 'Front Desk',
    blurb: 'Register patients, book and reschedule visits, and check arrivals in to the waiting room',
    crest: <SupportAgentOutlinedIcon />,
    layout: 'counters',
    tiles: [
      { label: 'Checked In', read: s => s.checkedIn, icon: <HowToRegOutlinedIcon />, to: '/appointments' },
      { label: 'Waiting', read: s => s.waiting, icon: <HourglassEmptyOutlinedIcon />, to: '/appointments' },
      { label: 'Appointments Today', read: s => s.appointmentsToday, icon: <CalendarMonthOutlinedIcon />, to: '/appointments' },
      { label: 'Registered Today', read: s => s.newPatientsToday, icon: <GroupsOutlinedIcon />, to: '/patients' },
    ],
    panels: <>
      <InTheClinic act="to-room" first={{ label: 'Register or check in a patient', to: '/patients' }} />
    </>,
    lookback: <AppointmentsLookback />,
    action: { label: 'Register a patient', to: '/patients' },
  },
  Clinician: {
    title: 'Consulting Room',
    blurb: 'See the patients waiting for you, document the visit, prescribe and request tests, then sign it off',
    crest: <StethoscopeIcon />,
    layout: 'counters',
    tiles: [
      // Everyone in the building who is not yet in session — a clinician does not care
      // whether the front desk has walked them to the waiting room yet.
      { label: 'Waiting Now', read: s => s.checkedIn + s.waiting, icon: <HourglassEmptyOutlinedIcon />, to: '/appointments' },
      { label: 'In Session', read: s => s.inSession, icon: <StethoscopeIcon />, to: '/appointments' },
      { label: 'Open Encounters', read: s => s.draftEncounters, icon: <DescriptionOutlinedIcon />, to: '/records' },
      { label: 'Finalized Today', read: s => s.finalizedToday, icon: <TaskAltOutlinedIcon />, to: '/records' },
    ],
    panels: <>
      <InTheClinic act="start-session" first={{ label: 'See who is booked today', to: '/appointments' }} />
      <UnfinishedNotes />
    </>,
    lookback: <VisitsLookback />,
  },
  'Lab Technician': {
    title: 'The Bench',
    blurb: 'Run the tests clinicians request, record each result, and cancel with a reason when you cannot',
    crest: <BiotechOutlinedIcon />,
    layout: 'bench',
    tiles: [
      { label: 'Pending Tests', read: s => s.labPending, icon: <ScienceOutlinedIcon />, to: '/laboratory' },
      { label: 'Resulted Today', read: s => s.labResultedToday, icon: <TaskAltOutlinedIcon />, to: '/laboratory' },
      { label: 'Cancelled', read: s => s.labCancelled, icon: <BlockOutlinedIcon />, to: '/laboratory' },
      { label: 'Visits Closed Today', read: s => s.finalizedToday, icon: <DescriptionOutlinedIcon /> },
    ],
    panels: <PendingTests />,
    lookback: <LabLookback />,
    action: { label: 'Open the lab queue', to: '/laboratory' },
  },
  Pharmacist: {
    title: 'The Counter',
    blurb: 'Dispense what clinicians prescribed, and mark what you cannot supply with a reason',
    crest: <LocalPharmacyOutlinedIcon />,
    layout: 'bench',
    tiles: [
      { label: 'Pending', read: s => s.prescriptionsPending, icon: <MedicationOutlinedIcon />, to: '/pharmacy' },
      { label: 'Dispensed Today', read: s => s.prescriptionsDispensedToday, icon: <TaskAltOutlinedIcon />, to: '/pharmacy' },
      { label: 'Unavailable', read: s => s.prescriptionsUnavailable, icon: <BlockOutlinedIcon />, to: '/pharmacy' },
      { label: 'Visits Closed Today', read: s => s.finalizedToday, icon: <DescriptionOutlinedIcon /> },
    ],
    panels: <PendingMedicines />,
    lookback: <PharmacyLookback />,
    action: { label: 'Open the dispensing queue', to: '/pharmacy' },
  },
  Administrator: {
    title: 'Facility Overview',
    blurb: 'Manage staff accounts and clinic settings, and watch every department without doing its work',
    crest: <ApartmentOutlinedIcon />,
    layout: 'counters',
    tiles: [
      { label: 'Total Patients', read: s => s.totalPatients, icon: <GroupsOutlinedIcon />, to: '/patients' },
      { label: 'Appointments Today', read: s => s.appointmentsToday, icon: <CalendarMonthOutlinedIcon />, to: '/appointments' },
      { label: 'Open Encounters', read: s => s.draftEncounters, icon: <DescriptionOutlinedIcon />, to: '/records' },
      { label: 'Clinicians Documenting', read: s => s.clinicians, icon: <StethoscopeIcon />, to: '/staff' },
    ],
    panels: <>
      <InTheClinic first={{ label: 'See the appointment book', to: '/appointments' }} />
      <UnfinishedNotes readOnly />
    </>,
    lookback: <AppointmentsLookback />,
  },
}
