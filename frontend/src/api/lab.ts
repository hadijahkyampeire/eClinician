import { API_URL } from './config'
import type { LabOrder, LabResultForm, LabStatus } from '../types/lab'

async function request<T>(path: string, tenantId: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId, ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Lab request failed')
  }
  return response.json()
}

export function getLabOrders(tenantId: string, status?: LabStatus) {
  const query = status ? `?status=${status}` : ''
  return request<LabOrder[]>(`/api/lab/orders${query}`, tenantId)
}

export function updateLabOrder(tenantId: string, id: string, form: LabResultForm) {
  return request<LabOrder>(`/api/lab/orders/${id}`, tenantId, {
    method: 'POST',
    body: JSON.stringify(form),
  })
}
