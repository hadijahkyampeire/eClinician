import { parseBloodPressure } from '../lib/vitals'
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

/**
 * The form as the API takes it. One box on screen holds the blood pressure, two columns
 * hold it in the record, and half a reading is no reading — anything that is not "120/80"
 * is sent as neither number rather than a guess.
 */
function body(form: EncounterForm) {
  const number = (value: string) => value === '' ? null : Number(value)
  const { bloodPressure, ...rest } = form
  const pressure = parseBloodPressure(bloodPressure)
  return JSON.stringify({
    ...rest,
    systolicBp: pressure?.systolic ?? null,
    diastolicBp: pressure?.diastolic ?? null,
    temperatureCelsius: number(form.temperatureCelsius),
    pulseBpm: number(form.pulseBpm),
    weightKg: number(form.weightKg),
    heightCm: number(form.heightCm),
  })
}

export function saveEncounter(form: EncounterForm, id?: string) {
  return request<Encounter>(id ? `/api/encounters/${id}` : '/api/encounters', {
    method: id ? 'PUT' : 'POST',
    body: body(form),
  })
}

/**
 * Drafts a summary from the notes on screen and returns the paragraph. Nothing is saved:
 * the summarizer reads the diagnosis just typed, and the clinician keeps or rewrites it
 * before the note is saved like any other field.
 */
export function draftEncounterSummary(form: EncounterForm) {
  return request<{ visitSummary: string }>('/api/encounters/summary',
    { method: 'POST', body: body(form) }).then(drafted => drafted.visitSummary)
}

/**
 * Raises the tests already listed on the note and walks the patient to the bench. The
 * encounter stays a draft: the visit is paused, not finished.
 */
export function sendEncounterToLab(id: string) {
  return request<Encounter>(`/api/encounters/${id}/lab`, { method: 'POST' })
}

export function finalizeEncounter(id: string) {
  return request<Encounter>(`/api/encounters/${id}/finalize`, { method: 'POST' })
}
