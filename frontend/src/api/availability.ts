import { request as send } from './http'
import type { AvailabilityShift } from '../types/availability'

const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Availability request failed')

export function getMyAvailability() {
  return request<AvailabilityShift[]>('/api/clinician-availability/me')
}

export function saveMyAvailability(shifts: AvailabilityShift[]) {
  return request<AvailabilityShift[]>('/api/clinician-availability/me', {
    method: 'PUT', body: JSON.stringify({ shifts }),
  })
}
