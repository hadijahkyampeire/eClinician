import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getLabOrders, updateLabOrder } from '../api/lab'
import { useAuth } from '../auth/AuthContext'
import type { LabOrder, LabStatus } from '../types/lab'

const FILTERS: { label: string; value: LabStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'All', value: 'ALL' },
]

export default function Laboratory() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const tenantId = session?.tenant?.id
  const technicianName = session?.user.name ?? 'Unknown'
  const [filter, setFilter] = useState<LabStatus | 'ALL'>('PENDING')
  const [error, setError] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['lab-orders', tenantId, filter],
    queryFn: () => getLabOrders(tenantId!, filter === 'ALL' ? undefined : filter),
    enabled: Boolean(tenantId),
  })

  const mutation = useMutation({
    mutationFn: (input: { id: string; status: 'COMPLETED' | 'CANCELLED'; result: string; notes: string }) =>
      updateLabOrder(tenantId!, input.id, { ...input, technicianName }),
    onSuccess: () => {
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update lab order')
    },
  })

  function recordResult(order: LabOrder) {
    const result = window.prompt(`Result for ${order.testName}`, order.result || '')
    if (result === null || !result.trim()) return
    mutation.mutate({ id: order.id, status: 'COMPLETED', result, notes: '' })
  }

  function cancel(order: LabOrder) {
    const notes = window.prompt('Why can this test not be run?', order.notes || 'No reagent')
    if (notes === null) return
    mutation.mutate({ id: order.id, status: 'CANCELLED', result: '', notes })
  }

  return (
    <>
      <div className="page-header"><h2>Laboratory</h2><p>Tests requested by clinicians</p></div>

      <div className="pharmacy-filters">
        {FILTERS.map(item => (
          <button key={item.value} className={`pharmacy-tab${filter === item.value ? ' active' : ''}`}
            onClick={() => setFilter(item.value)}>{item.label}</button>
        ))}
      </div>

      {error && <p className="patient-error">{error}</p>}

      <section className="card record-list-card">
        <div className="record-list-heading"><h3>Lab queue</h3><span>{data.length} items</span></div>
        {isLoading ? <p className="record-empty">Loading lab orders...</p>
          : data.length ? <div className="record-list">
              {data.map(order => <LabRow key={order.id} order={order} busy={mutation.isPending}
                onResult={() => recordResult(order)} onCancel={() => cancel(order)} />)}
            </div>
          : <p className="record-empty">Nothing here. Lab orders appear when a clinician finalizes an encounter.</p>}
      </section>
    </>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function LabRow({ order, busy, onResult, onCancel }: {
  order: LabOrder; busy: boolean; onResult: () => void; onCancel: () => void
}) {
  return <div className="record-row">
    <div>
      <b>{order.testName}</b>
      <small>{order.patientName}{order.result ? ` · ${order.result}` : order.notes ? ` · ${order.notes}` : ''}</small>
    </div>
    <div>
      <span className={`record-status ${order.status.toLowerCase()}`}>{order.status.toLowerCase()}</span>
      {order.status === 'COMPLETED'
        ? <time>{order.resultedBy} · {formatDateTime(order.resultedAt!)}</time>
        : <div className="pharmacy-actions">
            <button className="btn" disabled={busy} onClick={onResult}>Record result</button>
            <button className="btn ghost" disabled={busy} onClick={onCancel}>Cancel</button>
          </div>}
    </div>
  </div>
}
