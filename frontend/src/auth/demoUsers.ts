import type { Session, Tenant } from './AuthContext'

// Your seeded sample hospital — all clinical demo users belong to it.
const SAMPLE_HOSPITAL: Tenant = {
  id: 'sample-hospital',
  name: 'HKCare',
  primaryColor: '#0f766e',
  enabledModules: ['patients', 'appointments', 'records', 'pharmacy', 'laboratory'],
}

export interface DemoUser {
  id: string
  label: string
  blurb: string
  session: Session
}

export const demoUsers: DemoUser[] = [
  {
    id: 'admin',
    label: 'Hospital Administrator',
    blurb: 'Manage staff, departments & facility',
    session: {
      user: { name: 'Amina Okello', email: 'admin@stmarys.eclinician.com', role: 'Administrator' },
      isPlatformAdmin: false,
      tenant: SAMPLE_HOSPITAL,
    },
  },
  {
    id: 'clinician',
    label: 'Clinician',
    blurb: 'Consultations, prescriptions & lab orders',
    session: {
      user: { name: 'Dr. Sarah Jenkins', email: 'sjenkins@stmarys.eclinician.com', role: 'Clinician' },
      isPlatformAdmin: false,
      tenant: SAMPLE_HOSPITAL,
    },
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    blurb: 'Register patients & book appointments',
    session: {
      user: { name: 'Grace Nakato', email: 'reception@stmarys.eclinician.com', role: 'Receptionist' },
      isPlatformAdmin: false,
      tenant: SAMPLE_HOSPITAL,
    },
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    blurb: 'Review & dispense prescriptions',
    session: {
      user: { name: 'John Etyang', email: 'pharmacy@stmarys.eclinician.com', role: 'Pharmacist' },
      isPlatformAdmin: false,
      tenant: SAMPLE_HOSPITAL,
    },
  },
  {
    id: 'labtech',
    label: 'Lab Technician',
    blurb: 'Process lab requests & record results',
    session: {
      user: { name: 'Peter Ssali', email: 'lab@stmarys.eclinician.com', role: 'Lab Technician' },
      isPlatformAdmin: false,
      tenant: SAMPLE_HOSPITAL,
    },
  },
  {
    id: 'platform',
    label: 'Platform Super Admin',
    blurb: 'Onboard hospitals & manage subscriptions',
    session: {
      user: { name: 'Hadijah K.', email: 'root@eclinician.com', role: 'Administrator' },
      isPlatformAdmin: true,
      tenant: null,
    },
  },
]
