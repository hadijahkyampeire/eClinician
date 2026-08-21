import type { Patient, PatientFilters, PatientForm } from '../types/patient'
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

interface PatientPage {
  content: Patient[]
}

import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Request failed')


export async function getPatients(
  search = '',
  filters: Partial<PatientFilters> = {},
) {
  const query = new URLSearchParams()
  if (search.trim()) query.set('q', search.trim())
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const suffix = query.size ? `?${query.toString()}` : ''
  const page = await request<PatientPage>(`/api/patients${suffix}`)
  return page.content
}

export function getPatient(id: string) {
  return request<Patient>(`/api/patients/${id}`)
}

export function createPatient(patient: PatientForm) {
  return request<Patient>('/api/patients', {
    method: 'POST',
    body: JSON.stringify(toRequestBody(patient)),
  })
}

export function updatePatient(id: string, patient: PatientForm) {
  return request<Patient>(`/api/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toRequestBody(patient)),
  })
}

export function deletePatient(id: string) {
  return request<void>(`/api/patients/${id}`, { method: 'DELETE' })
}

function toRequestBody(patient: PatientForm) {
  const { phoneCountry, phone, ...details } = patient
  const localNumber = phone.replace(/\D/g, '').replace(/^0+/, '')

  return {
    ...details,
    phone: `+${getCountryCallingCode(phoneCountry as CountryCode)}${localNumber}`,
    dateOfBirth: patient.dateOfBirth || null,
  }
}
