import type { Encounter, EncounterForm } from '../types/encounter'

import { API_URL } from './config'
import { authHeaders } from './session'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || Object.values(details || {})[0] || 'Encounter request failed')
  }
  return response.json()
}

export function getEncounters(patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
  return request<Encounter[]>(`/api/encounters${query}`)
}

export function getEncounter(id: string) {
  return request<Encounter>(`/api/encounters/${id}`)
}

export function saveEncounter(form: EncounterForm, id?: string) {
  const number = (value: string) => value === '' ? null : Number(value)
  return request<Encounter>(id ? `/api/encounters/${id}` : '/api/encounters', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify({
      ...form,
      temperatureCelsius: number(form.temperatureCelsius),
      pulseBpm: number(form.pulseBpm),
      weightKg: number(form.weightKg),
    }),
  })
}

export function finalizeEncounter(id: string) {
  return request<Encounter>(`/api/encounters/${id}/finalize`, { method: 'POST' })
}
