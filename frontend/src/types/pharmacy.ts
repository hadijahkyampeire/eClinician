export type PrescriptionStatus = 'PENDING' | 'DISPENSED' | 'UNAVAILABLE'

/** Mirrors PrescriptionResponse on the API. */
export interface Prescription {
  id: string
  patientId: string
  patientName: string
  encounterId: string
  /** What the clinician ordered. */
  medication: string
  status: PrescriptionStatus
  /** What the pharmacist handed over; null until dispensed. */
  dispensedMedication: string | null
  quantityDispensed: number | null
  dispenseUnit: string | null
  /** What is in each container — "100 ml" for a bottle. Null when not a container. */
  packSize: string | null
  /** True when the two medicines differ. */
  substituted: boolean
  dispensedBy: string | null
  dispensedAt: string | null
  notes: string | null
  createdAt: string
}

/**
 * Mirrors DispenseRequest. A pharmacist can never set PENDING, and never says who
 * they are — the API stamps that from their token.
 */
export interface DispenseForm {
  status: Exclude<PrescriptionStatus, 'PENDING'>
  dispensedMedication?: string
  quantityDispensed?: number | null
  dispenseUnit?: string
  packSize?: string
  notes: string
}

/**
 * What a pharmacy counts in, split by whether the unit is already a measure.
 *
 * A tablet is its own dose: "15 tablets" is a complete fact. A bottle is a container —
 * "1 bottle" is not, because it could hold 60ml or 200ml. Units in CONTAINERS ask for a
 * pack size alongside the count.
 */
export const MEASURE_UNITS = ['tablets', 'capsules', 'ml', 'mg', 'g', 'drops']
export const CONTAINER_UNITS = [
  'bottles', 'sachets', 'vials', 'ampoules', 'tubes', 'inhalers', 'suppositories',
]
export const DISPENSE_UNITS = [...MEASURE_UNITS, ...CONTAINER_UNITS]

export const isContainer = (unit: string) => CONTAINER_UNITS.includes(unit)

/** "15 tablets", "1 tablet", "2 × 100 ml bottles" — never "1 bottles". */
export function describeAmount(
  quantity: number | null | undefined,
  unit: string | null | undefined,
  packSize?: string | null,
) {
  if (quantity == null) return null
  const one = quantity === 1
  const noun = one && unit && unit.length > 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit
  return packSize
    ? `${quantity} × ${packSize} ${noun ?? ''}`.trim()
    : `${quantity} ${noun ?? ''}`.trim()
}

/** One person at the counter, with what they came for. Mirrors CounterPatient. */
export interface CounterPatient {
  patientId: string
  patientName: string
  medicines: Prescription[]
  /** Nothing left waiting to be handed over — they are free to go. */
  ready: boolean
}
