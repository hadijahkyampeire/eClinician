import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Staff request failed')
import type { Staff, StaffForm } from '../types/staff'


export function getStaff() {
  return request<Staff[]>('/api/staff')
}

/** Receptionists may read this one list, so a booking form can name a doctor. */
export function getClinicians() {
  return request<Staff[]>('/api/staff/clinicians')
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
