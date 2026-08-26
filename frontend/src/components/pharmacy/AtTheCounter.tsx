import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@mui/material'
import { checkOutOfPharmacy, getCounter } from '../../api/pharmacy'
import { useAuth } from '../../auth/AuthContext'

/**
 * Who is actually standing there.
 *
 * The queue below this is a list of medicines, which is the right shape for the work but
 * the wrong shape for the room: three boxes for one patient read as three people, and
 * nothing said whether anyone was waiting on them at all. This says who came, what they
 * came for, and — because the pharmacist is the last person to see them — lets the
 * counter be the place their visit finally closes.
 */
export default function AtTheCounter({ busy }: { busy: boolean }) {
  const tenantId = useAuth().session?.tenant?.id
  const queryClient = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['pharmacy-counter', tenantId], queryFn: getCounter,
    enabled: Boolean(tenantId), refetchInterval: 30_000,
  })

  const checkOut = useMutation({
    mutationFn: checkOutOfPharmacy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-counter'] })
      void queryClient.invalidateQueries({ queryKey: ['unsupplied'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
  if (!data.length) return null

  return (
    <section className="card counter-card">
      <div className="record-list-heading">
        <h3>At the counter</h3><span>{data.length} waiting</span>
      </div>
      {checkOut.error && <p className="patient-error">{checkOut.error.message}</p>}
      <div className="record-list">
        {data.map(person => (
          <div className="record-row" key={person.patientId}>
            <div>
              <b>{person.patientName}</b>
              <small>{person.medicines.map(order => order.medication).join(' · ')}</small>
            </div>
            <div>
              <span className={`record-status ${person.ready ? 'dispensed' : 'pending'}`}>
                {person.ready ? 'ready to go' : 'waiting'}
              </span>
              {/* Available whether or not everything was supplied: someone who gives up
                  and leaves without their medicine has still left. */}
              <Button size="small" variant={person.ready ? 'contained' : 'outlined'}
                disabled={busy || checkOut.isPending}
                onClick={() => checkOut.mutate(person.patientId)}>Check out</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
