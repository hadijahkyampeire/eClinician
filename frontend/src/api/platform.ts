import { API_URL } from './config'
import { authHeaders } from './session'
import type { Hospital, HospitalForm, PlatformStats } from '../types/tenant'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Platform request failed')
  }
  return response.json()
}

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
