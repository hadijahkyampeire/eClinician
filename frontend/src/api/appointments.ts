import type { Appointment } from '../types/appointment'

import { API_URL } from './config'

async function request<T>(path: string, tenantId: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || 'Appointment request failed')
  }
  return response.json()
}

export function getAppointments(tenantId: string, patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
  return request<Appointment[]>(`/api/appointments${query}`, tenantId)
}

export function checkInPatient(tenantId: string, patientId: string) {
  return request<Appointment>('/api/appointments/check-in', tenantId, {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  })
}

export function startPatientSession(tenantId: string, patientId: string) {
  return request<Appointment>(
    `/api/appointments/patients/${patientId}/start-session`,
    tenantId,
    { method: 'POST' },
  )
}

export function markAppointmentWaiting(tenantId: string, appointmentId: string) {
  return request<Appointment>(`/api/appointments/${appointmentId}/waiting`, tenantId, {
    method: 'POST',
  })
}

export function completeAppointment(tenantId: string, appointmentId: string) {
  return request<Appointment>(`/api/appointments/${appointmentId}/complete`, tenantId, {
    method: 'POST',
  })
}
