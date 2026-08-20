import type { ModuleKey } from '../auth/AuthContext'

/** Mirrors TenantResponse: a hospital as the platform console sees it. */
export interface Hospital {
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
