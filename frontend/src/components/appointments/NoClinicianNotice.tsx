import { Alert, AlertTitle } from '@mui/material'
import { Link } from 'react-router-dom'
import type { Staff } from '../../types/staff'

/**
 * Why the doctor list is empty.
 *
 * An empty dropdown says nothing, and "nobody is available" is not a reason. Since every
 * clinician is on the rota round the clock until they take hours off, an empty list means
 * one of exactly two things, and which one decides what the person at the desk does next.
 */
export default function NoClinicianNotice({ roster, when }: {
  /** Every active clinician at this clinic, regardless of the hour. */
  roster: Staff[] | undefined
  when: string
}) {
  if (roster === undefined) return null

  if (roster.length === 0) {
    return (
      <Alert severity="warning">
        <AlertTitle>No clinicians yet</AlertTitle>
        Nobody at this clinic has a clinician account, so there is no one to book.
        An administrator adds them under <Link to="/staff">Staff</Link>.
      </Alert>
    )
  }

  return (
    <Alert severity="warning">
      <AlertTitle>Nobody is on the rota at {when}</AlertTitle>
      {roster.length === 1 ? 'The one clinician here has' : `All ${roster.length} clinicians here have`}
      {' '}taken this time off their weekly availability. Pick another time, or ask them to
      publish it under Availability.
    </Alert>
  )
}
