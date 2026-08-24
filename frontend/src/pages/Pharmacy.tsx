import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPrescriptions, updatePrescription } from '../api/pharmacy'
import { useAuth } from '../auth/AuthContext'
import type { Prescription, PrescriptionStatus } from '../types/pharmacy'

const FILTERS: { label: string; value: PrescriptionStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Dispensed', value: 'DISPENSED' },
  { label: 'Unavailable', value: 'UNAVAILABLE' },
  { label: 'All', value: 'ALL' },
]

export default function Pharmacy() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const tenantId = session?.tenant?.id
  const [filter, setFilter] = useState<PrescriptionStatus | 'ALL'>('PENDING')
  const [error, setError] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['prescriptions', tenantId, filter],
    queryFn: () => getPrescriptions(filter === 'ALL' ? undefined : filter),
    enabled: Boolean(tenantId),
  })


  const mutation = useMutation({
    mutationFn: (input: { id: string; status: 'DISPENSED' | 'UNAVAILABLE'; notes: string }) =>
      updatePrescription(input.id, { status: input.status, notes: input.notes }),
    onSuccess: () => {
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['patient'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update prescription')
    },
  })

  function markUnavailable(order: Prescription) {
    const notes = window.prompt('Why is this unavailable?', order.notes || 'Out of stock')
    if (notes === null) return
    mutation.mutate({ id: order.id, status: 'UNAVAILABLE', notes })
  }

  return (
    <>
       <div className="page-header"><h2>Pharmacy</h2><p>Prescriptions raised by clinicians</p></div>

    <div className="pharmacy-filters">
      {FILTERS.map(item => (
        <button key={item.value} className={`pharmacy-tab${filter === item.value ? ' active' : ''}`}
          onClick={() => setFilter(item.value)}>{item.label}</button>
      ))}
    </div>

    {error && <p className="patient-error">{error}</p>}

    <section className="card record-list-card">
      <div className="record-list-heading"><h3>Prescription queue</h3><span>{data.length} items</span></div>
      {isLoading ? <p className="record-empty">Loading prescriptions...</p>
        : data.length ? <div className="record-list">
            {data.map(order => <PrescriptionRow key={order.id} order={order} busy={mutation.isPending}
              onDispense={() => mutation.mutate({ id: order.id, status: 'DISPENSED', notes: '' })}
              onUnavailable={() => markUnavailable(order)} />)}
          </div>
        : <p className="record-empty">Nothing here. Prescriptions appear when a clinician finalizes an encounter.</p>}
    </section>
    </>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function PrescriptionRow({ order, busy, onDispense, onUnavailable }: {
  order: Prescription; busy: boolean; onDispense: () => void; onUnavailable: () => void
}) {
  return <div className="record-row">
    <div>
      <b>{order.medication}</b>
      <small>{order.patientName}{order.notes ? ` · ${order.notes}` : ''}</small>
    </div>
    <div>
      <span className={`record-status ${order.status.toLowerCase()}`}>{order.status.toLowerCase()}</span>
      {order.status === 'DISPENSED'
        ? <time>{order.dispensedBy} · {formatDateTime(order.dispensedAt!)}</time>
        : <div className="pharmacy-actions">
            <button className="btn" disabled={busy} onClick={onDispense}>Dispense</button>
            <button className="btn ghost" disabled={busy} onClick={onUnavailable}>Unavailable</button>
          </div>}
    </div>
  </div>
}
