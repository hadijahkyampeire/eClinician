/**
 * The readings a clinician would otherwise work out on paper or look up in a table.
 * None of it is stored: it is arithmetic over what was just typed, so it cannot drift
 * out of step with the numbers it came from.
 */

export type Tone = 'ok' | 'warn' | 'alarm'
export interface BloodPressure { systolic: number; diastolic: number }
export interface Reading { label: string; value: string; note?: string; tone: Tone }

/** "120/80", however it was spaced. Anything else is not a reading. */
export function parseBloodPressure(value: string): BloodPressure | null {
  const match = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(value)
  return match ? { systolic: Number(match[1]), diastolic: Number(match[2]) } : null
}

/** Two stored numbers, read back the way they were taken. */
export const formatBloodPressure = (
  systolic: number | null, diastolic: number | null,
) => systolic && diastolic ? `${systolic}/${diastolic}` : ''

/** Diastole is the longer two thirds of the cycle, which is why the third lands there. */
const meanArterialPressure = ({ systolic, diastolic }: BloodPressure) =>
  Math.round(diastolic + (systolic - diastolic) / 3)

const bodyMassIndex = (weightKg: number, heightCm: number) =>
  Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10

/** ACC/AHA bands — the lookup nobody should be doing from memory mid-consultation. */
function bloodPressureBand({ systolic, diastolic }: BloodPressure): Reading {
  const band = (value: string, tone: Tone, note?: string): Reading =>
    ({ label: 'Blood pressure', value, tone, note })
  if (systolic >= 180 || diastolic >= 120) return band('Hypertensive crisis', 'alarm', 'Treat now')
  if (systolic >= 140 || diastolic >= 90) return band('Stage 2 hypertension', 'alarm')
  if (systolic >= 130 || diastolic >= 80) return band('Stage 1 hypertension', 'warn')
  if (systolic < 90 || diastolic < 60) return band('Low', 'warn')
  if (systolic >= 120) return band('Elevated', 'warn')
  return band('Normal', 'ok')
}

function bodyMassBand(bmi: number): Reading {
  const band = (note: string, tone: Tone): Reading =>
    ({ label: 'BMI', value: bmi.toFixed(1), note, tone })
  if (bmi < 18.5) return band('Underweight', 'warn')
  if (bmi < 25) return band('Healthy weight', 'ok')
  if (bmi < 30) return band('Overweight', 'warn')
  return band('Obese', 'alarm')
}

/** Whatever the numbers on screen support, in the order a clinician would read them. */
export function derivedVitals(vitals: {
  bloodPressure: string; weightKg: string; heightCm: string
}): Reading[] {
  const readings: Reading[] = []
  const pressure = parseBloodPressure(vitals.bloodPressure)
  if (pressure) {
    readings.push(bloodPressureBand(pressure))
    const mean = meanArterialPressure(pressure)
    readings.push({
      label: 'Mean arterial pressure', value: `${mean} mmHg`,
      note: mean < 65 ? 'Below 65 — organs may not be perfusing' : undefined,
      tone: mean < 65 ? 'alarm' : 'ok',
    })
    // Narrow says the stroke volume has dropped; wide says the vessels have stiffened.
    const pulse = pressure.systolic - pressure.diastolic
    readings.push({
      label: 'Pulse pressure', value: `${pulse} mmHg`,
      note: pulse < 25 ? 'Narrow' : pulse > 60 ? 'Wide' : undefined,
      tone: pulse < 25 || pulse > 60 ? 'warn' : 'ok',
    })
  }
  const weight = Number(vitals.weightKg)
  const height = Number(vitals.heightCm)
  if (weight > 0 && height > 0) readings.push(bodyMassBand(bodyMassIndex(weight, height)))
  return readings
}
