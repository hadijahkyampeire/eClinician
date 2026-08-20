import { API_URL } from './config'
import { authHeaders } from './session'
import type { ClinicSettings, Hospital } from '../types/tenant'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Clinic request failed')
  }
  return response.json()
}

/** The signed-in user's own clinic — the tenant comes from the token, not the path. */
export function getClinic() {
  return request<Hospital>('/api/clinic')
}

export function updateClinic(settings: ClinicSettings) {
  return request<Hospital>('/api/clinic', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
