export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  sex: string | null
  phone: string | null
  email: string | null
  nationalId: string | null
  address: string | null
}

export interface PatientForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: string
  phone: string
  email: string
  nationalId: string
  address: string
}

interface PatientPage {
  content: Patient[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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

export async function getPatients(tenantId: string, search: string) {
  const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
  const page = await request<PatientPage>(`/api/patients${query}`, tenantId)
  return page.content
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
  return {
    ...patient,
    dateOfBirth: patient.dateOfBirth || null,
  }
}
