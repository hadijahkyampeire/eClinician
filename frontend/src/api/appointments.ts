import type { Appointment, AppointmentForm } from '../types/appointment'

import { API_URL } from './config'
import { authHeaders } from './session'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || 'Appointment request failed')
  }
  return response.json()
}

export function getAppointments(patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
  return request<Appointment[]>(`/api/appointments${query}`)
}

export function scheduleAppointment(form: AppointmentForm) {
  return request<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(toBody(form)),
  })
}

export function updateAppointment(id: string, form: AppointmentForm) {
  return request<Appointment>(`/api/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toBody(form)),
  })
}

export function cancelAppointment(id: string) {
  return request<Appointment>(`/api/appointments/${id}/cancel`, { method: 'POST' })
}

/** The form holds a local datetime; the API stores the instant it stands for. */
function toBody(form: AppointmentForm) {
  return {
    patientId: form.patientId,
    doctorId: form.doctorId || null,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    reason: form.reason || null,
  }
}

export function checkInPatient(patientId: string) {
  return request<Appointment>('/api/appointments/check-in', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  })
}

export function startPatientSession(patientId: string) {
  return request<Appointment>(
    `/api/appointments/patients/${patientId}/start-session`,
    { method: 'POST' },
  )
}

export function markAppointmentWaiting(appointmentId: string) {
  return request<Appointment>(`/api/appointments/${appointmentId}/waiting`, {
    method: 'POST',
  })
}

export function completeAppointment(appointmentId: string) {
  return request<Appointment>(`/api/appointments/${appointmentId}/complete`, {
    method: 'POST',
  })
}
