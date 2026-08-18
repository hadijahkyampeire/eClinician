import type { Patient, PatientFilters, PatientForm } from '../types/patient'
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

interface PatientPage {
  content: Patient[]
}

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
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

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
