import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@mui/material'
import { getMyAvailability, saveMyAvailability } from '../api/availability'
import { useAuth } from '../auth/AuthContext'
import AvailabilityDay from '../components/availability/AvailabilityDay'
import { DAYS } from '../components/availability/days'
import type { AvailabilityShift, Weekday } from '../types/availability'

/**
 * A clinician's own rota. Reception can only book a doctor whose shift covers the time,
 * so this page is what makes them bookable — and everyone starts published, which means
 * the job here is usually taking hours *away* rather than adding them.
 */
export default function Availability() {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const queryClient = useQueryClient()
  const [shifts, setShifts] = useState<AvailabilityShift[]>([])
  const [message, setMessage] = useState('')

  const query = useQuery({
    queryKey: ['availability', tenantId], queryFn: getMyAvailability,
    enabled: Boolean(tenantId),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.data) setShifts(query.data.map(value => ({ ...value })))
  }, [query.data])

  const mutation = useMutation({
    mutationFn: saveMyAvailability,
    onSuccess: async data => {
      setShifts(data)
      setMessage('Weekly availability published.')
      await queryClient.invalidateQueries({ queryKey: ['clinicians'] })
    },
    onError: () => setMessage('Could not save availability.'),
  })

  const forDay = (day: Weekday) => shifts.filter(shift => shift.dayOfWeek === day)
  const replaceDay = (day: Weekday, next: AvailabilityShift[]) =>
    setShifts(current => [...current.filter(shift => shift.dayOfWeek !== day), ...next])

  // The server sends HH:mm:ss and a time input gives HH:mm, so both are cut to HH:mm
  // before they are compared — otherwise "14:00" reads as earlier than "14:00:00".
  const incomplete = shifts.some(shift =>
    !shift.room.trim() || shift.endTime.slice(0, 5) <= shift.startTime.slice(0, 5))

  return (
    <>
      <div className="page-header">
        <h2>Weekly availability</h2>
        <p>
          The hours and consultation room reception may book. Remove a shift to make
          yourself unavailable for it; clear a whole day to take it off.
        </p>
      </div>

      <section className="card availability-card">
        {query.isLoading ? <p>Loading availability…</p> : (
          <div className="availability-list">
            {DAYS.map(day => (
              <AvailabilityDay key={day.value} day={day} shifts={forDay(day.value)}
                onChange={next => replaceDay(day.value, next)} />
            ))}
          </div>
        )}

        {message && <p className="availability-message" role="status">{message}</p>}
        <Button variant="contained" disabled={mutation.isPending || incomplete}
          onClick={() => mutation.mutate(shifts)}>
          {mutation.isPending ? 'Publishing…' : 'Publish availability'}
        </Button>
      </section>
    </>
  )
}
