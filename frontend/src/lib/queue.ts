import type { Appointment } from '../types/appointment'

/**
 * The order a clinician takes patients in, in one place because it was in two and they
 * disagreed — the dashboard read the waiting clock, the appointments queue read the
 * arrival one, so a patient back from the lab sat at the top of one list and the bottom
 * of the other.
 *
 * Two rules, and deliberately no more: whoever cannot wait goes first, then whoever has
 * waited longest. A five-point triage scale is a thing nobody at a busy front desk has
 * time to grade.
 */
export function byQueueOrder(a: Appointment, b: Appointment) {
  if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
  return queuedAt(a).localeCompare(queuedAt(b))
}

/**
 * When this patient last joined the queue. A trip to the lab restarts it: the clinician
 * has been seeing other people meanwhile, and someone who has not been seen at all should
 * not lose their turn to someone coming back for a second look.
 */
export const queuedAt = (appointment: Appointment) =>
  appointment.status === 'WAITING'
    ? appointment.waitingAt ?? appointment.checkedInAt ?? appointment.scheduledAt
    : appointment.checkedInAt ?? appointment.scheduledAt
