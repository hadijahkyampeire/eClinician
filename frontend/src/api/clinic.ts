import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Clinic request failed')
import type { ClinicSettings, Hospital } from '../types/tenant'


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
