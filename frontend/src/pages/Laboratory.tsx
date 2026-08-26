import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TextField } from '@mui/material'
import { getLabOrders, updateLabOrder } from '../api/lab'
import { useAuth } from '../auth/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import LabRow from '../components/lab/LabRow'
import type { LabOrder, LabResultForm, LabStatus } from '../types/lab'

const FILTERS: { label: string; value: LabStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  // Sample taken but not yet read. Without its own tab, a culture plated on Tuesday
  // falls off the default view and is remembered by nobody.
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'All', value: 'ALL' },
]

export default function Laboratory() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const tenantId = session?.tenant?.id
  const [filter, setFilter] = useState<LabStatus | 'ALL'>('PENDING')
  const [error, setError] = useState('')
  // Both of these used to be window.prompt. A clinical result typed into a browser prompt
  // cannot be validated, laid out, or read back before it is saved.
  const [resulting, setResulting] = useState<LabOrder | null>(null)
  const [cancelling, setCancelling] = useState<LabOrder | null>(null)
  const [text, setText] = useState('')
  // Saving without finishing: the result box stays open to be added to later.
  const [draft, setDraft] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['lab-orders', tenantId, filter],
    queryFn: () => getLabOrders(filter === 'ALL' ? undefined : filter),
    enabled: Boolean(tenantId),
  })

  const mutation = useMutation({
    mutationFn: (input: { id: string; status: LabResultForm['status']; result: string; notes: string }) =>
      updateLabOrder(input.id, { status: input.status, result: input.result, notes: input.notes }),
    onSuccess: () => {
      setError('')
      setResulting(null)
      setCancelling(null)
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update lab order')
    },
  })

  function openResult(order: LabOrder) {
    setText(order.result || '')
    setDraft(false)
    setResulting(order)
  }

  /**
   * The specimen is taken and the patient can go — whatever has been read so far is
   * saved as a draft, and the technician comes back to it when the test is finished.
   */
  function sampleTaken(order: LabOrder) {
    mutation.mutate({ id: order.id, status: 'IN_PROGRESS', result: order.result || '', notes: '' })
  }

  function openCancel(order: LabOrder) {
    setText(order.notes || '')
    setCancelling(order)
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
                onResult={() => openResult(order)} onStart={() => sampleTaken(order)}
                onCancel={() => openCancel(order)} />)}
            </div>
          : <p className="record-empty">Nothing here. Lab orders appear when a clinician finalizes an encounter.</p>}
      </section>

      {resulting && (
        <ConfirmDialog
          title={`Result for ${resulting.testName}`}
          message={<>
            Recorded against {resulting.patientName}, under your name. Saving it finishes
            the test and tells the clinician there is something to read.
          </>}
          confirmLabel={draft ? 'Save draft' : 'Save result'}
          busy={mutation.isPending} disabled={!text.trim()}
          onClose={() => setResulting(null)}
          onConfirm={() => mutation.mutate({
            id: resulting.id, status: draft ? 'IN_PROGRESS' : 'COMPLETED',
            result: text.trim(), notes: '' })}>
          <TextField autoFocus fullWidth multiline minRows={2} size="small" required
            label="Result" value={text} onChange={(event) => setText(event.target.value)} />
          {/* A test read over two days is written down twice. Keeping it a draft leaves
              it on the bench's list and says nothing to the clinician yet. */}
          <label className="lab-draft-choice">
            <input type="checkbox" checked={draft}
              onChange={(event) => setDraft(event.target.checked)} />
            Not finished — save this and keep the test on my list
          </label>
        </ConfirmDialog>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this test?"
          message={<>
            <b>{cancelling.testName}</b> for {cancelling.patientName} will not be run. The
            clinician who ordered it sees your reason instead of a result.
          </>}
          confirmLabel="Cancel test" danger
          busy={mutation.isPending} disabled={!text.trim()}
          onClose={() => setCancelling(null)}
          onConfirm={() => mutation.mutate({
            id: cancelling.id, status: 'CANCELLED', result: '', notes: text.trim() })}>
          <TextField autoFocus fullWidth size="small" required label="Why?"
            placeholder="No reagent" value={text}
            onChange={(event) => setText(event.target.value)} />
        </ConfirmDialog>
      )}
    </>
  )
}
