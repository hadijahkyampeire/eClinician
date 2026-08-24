import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyAvailability, saveMyAvailability } from '../api/availability'
import { useAuth } from '../auth/AuthContext'
import type { AvailabilityShift, Weekday } from '../types/availability'

const DAYS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' }, { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' }, { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' }, { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

const defaultShift = (dayOfWeek: Weekday): AvailabilityShift => ({
  dayOfWeek, startTime: '08:00', endTime: '17:00', room: '',
})

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
    // Copy the server rota into the editable local form once it arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.data) setShifts(query.data.map(value => ({ ...value })))
  }, [query.data])

  const mutation = useMutation({
    mutationFn: saveMyAvailability,
    onSuccess: async data => {
      setShifts(data); setMessage('Weekly availability published.')
      await queryClient.invalidateQueries({ queryKey: ['clinicians'] })
    },
    onError: () => setMessage('Could not save availability.'),
  })

  function toggle(day: Weekday, enabled: boolean) {
    setShifts(current => enabled
      ? [...current, defaultShift(day)]
      : current.filter(value => value.dayOfWeek !== day))
  }

  function change(day: Weekday, field: 'startTime' | 'endTime' | 'room', value: string) {
    setShifts(current => current.map(shift =>
      shift.dayOfWeek === day ? { ...shift, [field]: value } : shift))
  }

  return <>
    <div className="page-header"><h2>Weekly availability</h2>
      <p>Publish the hours and consultation room reception may book.</p></div>
    <section className="card availability-card">
      {query.isLoading ? <p>Loading availability…</p> : <div className="availability-list">
        {DAYS.map(day => {
          const shift = shifts.find(value => value.dayOfWeek === day.value)
          return <div className="availability-row" key={day.value}>
            <label><input type="checkbox" checked={Boolean(shift)}
              onChange={event => toggle(day.value, event.target.checked)} /> {day.label}</label>
            <input type="time" disabled={!shift} value={shift?.startTime?.slice(0, 5) || '08:00'}
              onChange={event => change(day.value, 'startTime', event.target.value)} />
            <span>to</span>
            <input type="time" disabled={!shift} value={shift?.endTime?.slice(0, 5) || '17:00'}
              onChange={event => change(day.value, 'endTime', event.target.value)} />
            <input disabled={!shift} placeholder="Consultation room" value={shift?.room || ''}
              onChange={event => change(day.value, 'room', event.target.value)} />
          </div>
        })}
      </div>}
      {message && <p className="availability-message" role="status">{message}</p>}
      <button className="btn" disabled={mutation.isPending || shifts.some(s => !s.room.trim())}
        onClick={() => mutation.mutate(shifts)}>
        {mutation.isPending ? 'Publishing…' : 'Publish availability'}
      </button>
    </section>
  </>
}
