import type { ModuleKey } from '../auth/AuthContext'

/**
 * Where a hospital is, in the shape international addresses agree on. Every field is
 * optional: a clinic onboarded before this existed has none of it.
 *
 * `subdivision` is ISO 3166-2's name for the level below a country — a district in
 * Uganda, a state in the US, a province in Canada. One field for whichever this country
 * calls it, so the console filters the whole world by the same thing.
 */
export interface HospitalAddress {
  addressLine: string | null
  city: string | null
  subdivision: string | null
  postalCode: string | null
  /** ISO 3166-1 alpha-2, upper case. */
  country: string | null
  phone: string | null
  email: string | null
}

/** Mirrors TenantResponse: a hospital as the platform console sees it. */
export interface Hospital extends HospitalAddress {
  id: string
  name: string
  primaryColor: string
  enabledModules: ModuleKey[]
  active: boolean
  createdAt: string
}

/** Mirrors TenantRequest. Modules go up as the API's enum names. */
export interface HospitalForm {
  id: string
  name: string
  primaryColor: string
  modules: ModuleKey[]
  addressLine: string
  city: string
  subdivision: string
  postalCode: string
  country: string
  phone: string
  email: string
  /** Only sent when onboarding: the hospital's first administrator. */
  adminName?: string
  adminEmail?: string
  adminPassword?: string
}

/** Mirrors ClinicSettingsRequest: what a hospital's own administrator may change. */
export interface ClinicSettings {
  name: string
  primaryColor: string
}

/** Mirrors PlatformStats. */
export interface PlatformStats {
  hospitals: number
  activeHospitals: number
  users: number
}

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'patients', label: 'Patients' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'records', label: 'Records' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'laboratory', label: 'Laboratory' },
]

/** Mirrors PlatformStaffRow: an account the console can see but never edit. */
export interface PlatformStaff {
  id: string
  name: string
  email: string
  roleLabel: string
  specialty: string | null
  active: boolean
  createdAt: string
  hospitalId: string
  hospitalName: string
}

/** Mirrors PlatformPatientRow. De-identified on purpose — a census, not a chart. */
export interface PlatformPatient {
  reference: string
  sex: string | null
  age: number | null
  careStatus: string | null
  registeredAt: string
  hospitalId: string
  hospitalName: string
}

/** What the console's two location filters may offer, given the country chosen. */
export interface HospitalFilterOptions {
  countries: string[]
  subdivisions: string[]
}

/** The three ways the console narrows its hospital list. All optional. */
export interface HospitalFilters {
  search: string
  country: string
  subdivision: string
}
