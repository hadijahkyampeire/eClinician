import type { Encounter, EncounterForm } from '../types/encounter'

import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Encounter request failed')


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

/** Asks the API to draft this visit's summary from the notes already saved on it. */
export function draftEncounterSummary(id: string) {
  return request<Encounter>(`/api/encounters/${id}/summary`, { method: 'POST' })
}

export function finalizeEncounter(id: string) {
  return request<Encounter>(`/api/encounters/${id}/finalize`, { method: 'POST' })
}
