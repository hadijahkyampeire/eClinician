import { request as send } from './http'
import type {
  Hospital, HospitalForm, PlatformPatient, PlatformStaff, PlatformStats,
} from '../types/tenant'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Platform request failed')

export function getPlatformStats() {
  return request<PlatformStats>('/api/platform/stats')
}

export function getHospitals() {
  return request<Hospital[]>('/api/platform/hospitals')
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
