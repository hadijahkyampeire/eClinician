/** The role names the API stores, paired with the labels it renders. */
export const STAFF_ROLES = [
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'CLINICIAN', label: 'Clinician' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]['value']

/** Mirrors StaffResponse. No password ever comes back. */
export interface Staff {
  id: string
  name: string
  email: string
  role: StaffRole
  roleLabel: string
  specialty: string | null
  consultationRoom: string | null
  active: boolean
  createdAt: string
}

/** Mirrors StaffRequest. The password is required on create, optional on update. */
export interface StaffForm {
  name: string
  email: string
  role: StaffRole
  specialty: string
  password: string
}
