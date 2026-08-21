import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Lab request failed')
import type { LabOrder, LabResultForm, LabStatus } from '../types/lab'


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
