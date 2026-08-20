import type { Session } from './AuthContext'

/**
 * The demo dropdown on the login screen: it fills in an email, nothing more. The
 * hospital's name, colour and modules used to be hardcoded here — they now come back
 * from the API, which reads them from the tenants table.
 */
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
      tenant: null,
    },
  },
  {
    id: 'clinician',
    label: 'Clinician',
    blurb: 'Consultations, prescriptions & lab orders',
    session: {
      user: { name: 'Dr. Sarah Jenkins', email: 'sjenkins@stmarys.eclinician.com', role: 'Clinician' },
      isPlatformAdmin: false,
      tenant: null,
    },
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    blurb: 'Register patients & book appointments',
    session: {
      user: { name: 'Grace Nakato', email: 'reception@stmarys.eclinician.com', role: 'Receptionist' },
      isPlatformAdmin: false,
      tenant: null,
    },
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    blurb: 'Review & dispense prescriptions',
    session: {
      user: { name: 'John Etyang', email: 'pharmacy@stmarys.eclinician.com', role: 'Pharmacist' },
      isPlatformAdmin: false,
      tenant: null,
    },
  },
  {
    id: 'labtech',
    label: 'Lab Technician',
    blurb: 'Process lab requests & record results',
    session: {
      user: { name: 'Peter Ssali', email: 'lab@stmarys.eclinician.com', role: 'Lab Technician' },
      isPlatformAdmin: false,
      tenant: null,
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
