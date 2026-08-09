import { API_URL } from './config'
import type { Prescription, DispenseForm, PrescriptionStatus } from '../types/pharmacy'

async function request<T>(path: string, tenantId: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId, ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Pharmacy request failed')
  }
  return response.json()
}

export function getPrescriptions(tenantId: string, status?: PrescriptionStatus) {
  const query = status ? `?status=${status}` : ''
  return request<Prescription[]>(`/api/pharmacy/prescriptions${query}`, tenantId)
}

export function updatePrescription(tenantId: string, id: string, form: DispenseForm) {
  return request<Prescription>(`/api/pharmacy/prescriptions/${id}`, tenantId, {
    method: 'POST',
    body: JSON.stringify(form),
  })
}