import { API_URL } from './config'
import { authHeaders } from './session'
import type { Prescription, DispenseForm, PrescriptionStatus } from '../types/pharmacy'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Pharmacy request failed')
  }
  return response.json()
}

export function getPrescriptions(status?: PrescriptionStatus) {
  const query = status ? `?status=${status}` : ''
  return request<Prescription[]>(`/api/pharmacy/prescriptions${query}`)
}

export function updatePrescription(id: string, form: DispenseForm) {
  return request<Prescription>(`/api/pharmacy/prescriptions/${id}`, {
    method: 'POST',
    body: JSON.stringify(form),
  })
}