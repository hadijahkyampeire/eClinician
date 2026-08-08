import type { Patient, PatientFilters, PatientForm } from '../types/patient'
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

interface PatientPage {
  content: Patient[]
}

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
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export async function getPatients(
  tenantId: string,
  search: string,
  filters: PatientFilters,
) {
  const query = new URLSearchParams()
  if (search.trim()) query.set('q', search.trim())
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const suffix = query.size ? `?${query.toString()}` : ''
  const page = await request<PatientPage>(`/api/patients${suffix}`, tenantId)
  return page.content
}

export function getPatient(tenantId: string, id: string) {
  return request<Patient>(`/api/patients/${id}`, tenantId)
}

export function createPatient(tenantId: string, patient: PatientForm) {
  return request<Patient>('/api/patients', tenantId, {
    method: 'POST',
    body: JSON.stringify(toRequestBody(patient)),
  })
}

export function updatePatient(tenantId: string, id: string, patient: PatientForm) {
  return request<Patient>(`/api/patients/${id}`, tenantId, {
    method: 'PUT',
    body: JSON.stringify(toRequestBody(patient)),
  })
}

export function deletePatient(tenantId: string, id: string) {
  return request<void>(`/api/patients/${id}`, tenantId, { method: 'DELETE' })
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
