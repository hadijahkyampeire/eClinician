/**
 * The seeded accounts, listed on the login screen so a demo can sign in as anyone.
 *
 * There is no role here on purpose. A role is not something a person picks at sign-in —
 * the account has one, the API reads it from `app_users`, signs it into the token, and
 * returns it. The screens a user sees follow from that answer, and the API enforces it
 * independently of what the browser does with it.
 */
export interface DemoAccount {
  label: string
  email: string
  blurb: string
}

/** Every seeded account shares this password (see UserSeeder on the API). */
export const DEMO_PASSWORD = 'demo1234'

export const demoAccounts: DemoAccount[] = [
  {
    label: 'Receptionist',
    email: 'hkreceptionist@hkclinics.com',
    blurb: 'Registers patients, books appointments, checks them in',
  },
  {
    label: 'Clinician',
    email: 'hkdoctor@hkclinics.com',
    blurb: 'Consults, documents the visit, prescribes and requests tests',
  },
  {
    label: 'Lab Technician',
    email: 'hklabtech@hkclinics.com',
    blurb: 'Works the laboratory queue and records results',
  },
  {
    label: 'Pharmacist',
    email: 'hkpharmacy@hkclinics.com',
    blurb: 'Dispenses the medicines a finalized visit raised',
  },
  {
    label: 'Hospital Administrator',
    email: 'hkaccounts@hkclinics.com',
    blurb: 'Manages staff accounts and sees the whole facility',
  },
  {
    label: 'Platform Super Admin',
    email: 'root@eclinician.com',
    blurb: 'Onboards hospitals — belongs to none, and sees no patient',
  },
]
