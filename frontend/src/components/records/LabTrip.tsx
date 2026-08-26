import { useQuery } from '@tanstack/react-query'
import { getPatientLabOrders } from '../../api/lab'
import { useAuth } from '../../auth/AuthContext'
import type { Encounter } from '../../types/encounter'

/**
 * The visit while the patient is not in the room.
 *
 * Sending someone for tests used to mean finalizing the visit, which meant writing a
 * diagnosis before the thing that would decide it had been run. Now the note stays open
 * and this says where they are: at the bench, or back with results to read.
 */
export default function LabTrip({ encounter }: { encounter: Encounter }) {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['lab-orders', tenantId, encounter.patientId],
    queryFn: () => getPatientLabOrders(encounter.patientId),
    enabled: Boolean(tenantId && encounter.sentToLabAt),
    // The results land here from the technician's screen, not this one.
    refetchInterval: encounter.labResultsReadyAt ? false : 30_000,
  })
  if (!encounter.sentToLabAt) return null

  const mine = data.filter(order => order.encounterId === encounter.id)
  const back = Boolean(encounter.labResultsReadyAt)

  return (
    <section className={`lab-trip${back ? ' ready' : ''}`}>
      <header>
        <b>{back ? 'Results are back' : 'At the lab'}</b>
        <span>{back
          ? `Resulted ${at(encounter.labResultsReadyAt!)} — read them, then finish the visit`
          : `Sent ${at(encounter.sentToLabAt)} — this note stays open until they return`}</span>
      </header>
      <ul>
        {mine.map(order => (
          <li key={order.id}>
            <b>{order.testName}</b>
            <span>{order.result || `${order.status.toLowerCase()} — nothing recorded yet`}</span>
            {order.notes && <small>{order.notes}</small>}
          </li>
        ))}
      </ul>
    </section>
  )
}

const at = (value: string) =>
  new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(new Date(value))
