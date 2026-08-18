import { API_URL } from './config'
import { authHeaders } from './session'
import type { LabOrder, LabResultForm, LabStatus } from '../types/lab'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Lab request failed')
  }
  return response.json()
}

export function getLabOrders(status?: LabStatus) {
  const query = status ? `?status=${status}` : ''
  return request<LabOrder[]>(`/api/lab/orders${query}`)
}

export function getPatientLabOrders(patientId: string) {
  return request<LabOrder[]>(`/api/lab/orders/patients/${patientId}`)
}

export function updateLabOrder(id: string, form: LabResultForm) {
  return request<LabOrder>(`/api/lab/orders/${id}`, {
    method: 'POST',
    body: JSON.stringify(form),
  })
}
