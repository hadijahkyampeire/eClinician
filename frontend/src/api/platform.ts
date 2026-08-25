import { request as send } from './http'
import type {
  Hospital, HospitalFilterOptions, HospitalFilters, HospitalForm,
  PlatformPatient, PlatformStaff, PlatformStats,
} from '../types/tenant'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Platform request failed')

export function getPlatformStats() {
  return request<PlatformStats>('/api/platform/stats')
}

/** Blank filters are left off the URL entirely — absent and empty mean the same thing. */
function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value?.trim() && search.set(key, value.trim()))
  return search.toString() ? `?${search}` : ''
}

/** The narrowing happens in the database; the browser only says what it wants. */
export function getHospitals(filters?: Partial<HospitalFilters>) {
  return request<Hospital[]>(`/api/platform/hospitals${query({ ...filters })}`)
}

export function getHospitalFilterOptions(country?: string) {
  return request<HospitalFilterOptions>(
    `/api/platform/hospitals/locations${query({ country })}`)
}

/** The API takes the module enum names; the UI works in the lowercase keys. */
function toBody(form: HospitalForm) {
  return { ...form, modules: form.modules.map((module) => module.toUpperCase()) }
}

export function createHospital(form: HospitalForm) {
  return request<Hospital>('/api/platform/hospitals', {
    method: 'POST',
    body: JSON.stringify(toBody(form)),
  })
}

export function updateHospital(id: string, form: HospitalForm) {
  return request<Hospital>(`/api/platform/hospitals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toBody(form)),
  })
}

export function setHospitalActive(id: string, active: boolean) {
  return request<Hospital>(`/api/platform/hospitals/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  })
}

export function getPlatformStaff() {
  return request<PlatformStaff[]>('/api/platform/staff')
}

export function getPlatformPatients() {
  return request<PlatformPatient[]>('/api/platform/patients')
}
