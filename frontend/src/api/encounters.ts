import type { Encounter, EncounterForm } from '../types/encounter'

import { API_URL } from './config'

async function request<T>(path: string, tenantId: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId, ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Encounter request failed')
  }
  return response.json()
}

export function getEncounters(tenantId: string, patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
  return request<Encounter[]>(`/api/encounters${query}`, tenantId)
}

export function getEncounter(tenantId: string, id: string) {
  return request<Encounter>(`/api/encounters/${id}`, tenantId)
}

export function saveEncounter(tenantId: string, form: EncounterForm, id?: string) {
  const number = (value: string) => value === '' ? null : Number(value)
  return request<Encounter>(id ? `/api/encounters/${id}` : '/api/encounters', tenantId, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify({
      ...form,
      temperatureCelsius: number(form.temperatureCelsius),
      pulseBpm: number(form.pulseBpm),
      weightKg: number(form.weightKg),
    }),
  })
}

export function finalizeEncounter(tenantId: string, id: string) {
  return request<Encounter>(`/api/encounters/${id}/finalize`, tenantId, { method: 'POST' })
}
