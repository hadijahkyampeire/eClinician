import { API_URL } from './config'
import { authHeaders } from './session'
import type { Staff, StaffForm } from '../types/staff'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Staff request failed')
  }
  return response.json()
}

export function getStaff() {
  return request<Staff[]>('/api/staff')
}

export function createStaff(form: StaffForm) {
  return request<Staff>('/api/staff', { method: 'POST', body: JSON.stringify(form) })
}

export function setStaffActive(id: string, active: boolean) {
  return request<Staff>(`/api/staff/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  })
}
