import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, TextField } from '@mui/material'
import { getPrescriptions, updatePrescription } from '../api/pharmacy'
import { useAuth } from '../auth/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import AtTheCounter from '../components/pharmacy/AtTheCounter'
import DispenseDialog from '../components/pharmacy/DispenseDialog'
import RowActions from '../components/RowActions'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import { describeAmount } from '../types/pharmacy'
import type { DispenseForm, Prescription, PrescriptionStatus } from '../types/pharmacy'

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
  // Marking a prescription unavailable ends it — the patient leaves without the drug —
  // so it asks why, and it asks before rather than through a browser prompt.
  const [unavailable, setUnavailable] = useState<Prescription | null>(null)
  const [reason, setReason] = useState('')
  // Dispensing now records what actually went over the counter, not just that it did.
  const [dispensing, setDispensing] = useState<Prescription | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['prescriptions', tenantId, filter],
    queryFn: () => getPrescriptions(filter === 'ALL' ? undefined : filter),
    enabled: Boolean(tenantId),
  })


  const mutation = useMutation({
    mutationFn: (input: { id: string; form: DispenseForm }) =>
      updatePrescription(input.id, input.form),
    onSuccess: () => {
      setError('')
      setUnavailable(null)
      setDispensing(null)
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-counter'] })
      void queryClient.invalidateQueries({ queryKey: ['unsupplied'] })
      void queryClient.invalidateQueries({ queryKey: ['patient'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update prescription')
    },
  })

  function askWhy(order: Prescription) {
    setReason(order.notes || '')
    setUnavailable(order)
  }

  return (
    <>
       <div className="page-header"><h2>Pharmacy</h2><p>Prescriptions raised by clinicians</p></div>

    <AtTheCounter busy={mutation.isPending} />

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
              onDispense={() => setDispensing(order)}
              onUnavailable={() => askWhy(order)} />)}
          </div>
        : <p className="record-empty">Nothing here. Prescriptions appear when a clinician finalizes an encounter.</p>}
    </section>

    {dispensing && (
      <DispenseDialog order={dispensing} busy={mutation.isPending} error={error || undefined}
        onClose={() => setDispensing(null)}
        onConfirm={form => mutation.mutate({ id: dispensing.id, form })} />
    )}

    {unavailable && (
      <ConfirmDialog
        title="Mark as unavailable?"
        message={<>
          <b>{unavailable.medication}</b> will not be dispensed to {unavailable.patientName}.
          The clinician sees the reason you give and can prescribe something else.
        </>}
        confirmLabel="Mark unavailable" danger
        busy={mutation.isPending} disabled={!reason.trim()}
        onClose={() => setUnavailable(null)}
        onConfirm={() => mutation.mutate({
          id: unavailable.id,
          form: { status: 'UNAVAILABLE', notes: reason.trim() } })}>
        <TextField autoFocus fullWidth size="small" label="Why?" value={reason}
          placeholder="Out of stock" required
          onChange={(event) => setReason(event.target.value)} />
      </ConfirmDialog>
    )}
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
      <small>{order.patientName}</small>
      {/* What actually went over the counter, when it is not what was ordered. */}
      {order.substituted && (
        <small className="dispensed-instead">
          <SwapHorizOutlinedIcon fontSize="inherit" /> Dispensed instead:{' '}
          <b>{order.dispensedMedication}</b>
        </small>
      )}
      {order.notes && <small className="dispense-note">{order.notes}</small>}
    </div>
    <div>
      <span className={`record-status ${order.status.toLowerCase()}`}>
        {order.status.toLowerCase()}
      </span>
      {order.status === 'DISPENSED'
        ? <>
            {order.quantityDispensed != null && (
              <small>
                {describeAmount(order.quantityDispensed, order.dispenseUnit, order.packSize)}
              </small>
            )}
            <time>{order.dispensedBy} · {formatDateTime(order.dispensedAt!)}</time>
          </>
        : <div className="pharmacy-actions">
            {/* Dispensing is the job; refusing it is the exception, so it goes in the menu. */}
            <Button variant="contained" size="small" disabled={busy}
              onClick={onDispense}>Dispense</Button>
            <RowActions label={`Actions for ${order.medication}`} actions={[{
              label: 'Mark unavailable', danger: true, disabled: busy,
              icon: <BlockOutlinedIcon fontSize="small" />, onClick: onUnavailable,
            }]} />
          </div>}
    </div>
  </div>
}
