import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@mui/material'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { getBench } from '../../api/lab'
import { useAuth } from '../../auth/AuthContext'
import { since } from '../dashboard/time'
import type { BenchPatient, LabOrder } from '../../types/lab'

/**
 * The queue as people.
 *
 * A flat list of tests put two patients needing a full blood count on two rows that read
 * identically, one under the other, and a result filed against the wrong one is the kind
 * of mistake nobody catches. So a technician picks a patient first and only then sees
 * what that patient needs — the samples in front of them belong to one person at a time.
 */
export default function BenchQueue({ busy, onResult, onStart, onCancel }: {
  busy: boolean
  onResult: (order: LabOrder) => void
  onStart: (order: LabOrder) => void
  onCancel: (order: LabOrder) => void
}) {
  const tenantId = useAuth().session?.tenant?.id
  const [open, setOpen] = useState<string | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['lab-bench', tenantId], queryFn: getBench,
    enabled: Boolean(tenantId), refetchInterval: 30_000,
  })

  return (
    <section className="card record-list-card">
      <div className="record-list-heading">
        <h3>Waiting to be run</h3><span>{data.length} patients</span>
      </div>
      {isLoading ? <p className="record-empty">Loading the queue...</p>
        : !data.length ? <p className="record-empty">
            Nothing waiting. Tests land here when a clinician sends a patient over.</p>
        : <div className="record-list">
            {data.map(person => (
              <div key={person.patientId}>
                <button className="bench-row" aria-expanded={open === person.patientId}
                  onClick={() => setOpen(open === person.patientId ? null : person.patientId)}>
                  <span className="bench-who">
                    <b>{person.patientName}</b>
                    <small>{summarise(person)}</small>
                  </span>
                  {/* Longest wait first, so the number that decides the order is on the row. */}
                  <span className="bench-waited">{since(person.waitingSince)} in the queue</span>
                  <ExpandMoreOutlinedIcon fontSize="small"
                    className={open === person.patientId ? 'bench-caret open' : 'bench-caret'} />
                </button>

                {open === person.patientId && (
                  <div className="bench-tests">
                    {person.tests.map(order => (
                      <div className="bench-test" key={order.id}>
                        <span>
                          <b>{order.testName}</b>
                          {order.result && <small>{order.result}</small>}
                        </span>
                        <span className={`record-status ${order.status.toLowerCase()}`}>
                          {order.status === 'IN_PROGRESS' ? 'in progress' : 'pending'}
                        </span>
                        <span className="bench-actions">
                          {order.status === 'PENDING' && (
                            <Button size="small" disabled={busy}
                              onClick={() => onStart(order)}>Sample taken</Button>
                          )}
                          <Button size="small" variant="contained" disabled={busy}
                            onClick={() => onResult(order)}>Record result</Button>
                          <Button size="small" color="error" disabled={busy}
                            onClick={() => onCancel(order)}>Cancel</Button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}
    </section>
  )
}

/**
 * Test names run long — "Blood slide for malaria parasites" — so one is usually all that
 * fits and the rest are counted rather than listed.
 */
function summarise({ tests }: BenchPatient) {
  const shown = tests.slice(0, 2).map(order => order.testName).join(', ')
  const rest = tests.length - Math.min(2, tests.length)
  return rest ? `${shown} +${rest} more` : shown
}
