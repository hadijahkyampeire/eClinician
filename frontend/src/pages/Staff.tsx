import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@mui/material'
import { createStaff, getStaff, setStaffActive } from '../api/staff'
import ConfirmDialog from '../components/ConfirmDialog'
import StaffForm from '../components/staff/StaffForm'
import StaffRow from '../components/staff/StaffRow'
import { useAuth } from '../auth/AuthContext'
import type { Staff as StaffMember, StaffForm as Form } from '../types/staff'

export default function Staff() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [deactivating, setDeactivating] = useState<StaffMember | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['staff', session?.tenant?.id],
    queryFn: getStaff,
    enabled: Boolean(session?.tenant?.id),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  const fail = (err: Error) => setError(err.message)

  const addMutation = useMutation({
    mutationFn: (form: Form) => createStaff(form),
    onSuccess: () => { setError(''); setAdding(false); void refresh() },
    onError: fail,
  })

  const activeMutation = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setStaffActive(input.id, input.active),
    onSuccess: () => { setError(''); setDeactivating(null); void refresh() },
    onError: fail,
  })

  return (
    <>
      <div className="page-header appointment-page-header">
        <div><h2>Staff</h2><p>Accounts for this facility</p></div>
        {!adding && <Button variant="contained" onClick={() => setAdding(true)}>
          Add staff member
        </Button>}
      </div>

      {adding && <StaffForm busy={addMutation.isPending}
        onSubmit={form => addMutation.mutate(form)} onCancel={() => { setAdding(false); setError('') }} />}

      {error && <p className="patient-error">{error}</p>}

      <section className="card record-list-card">
        <div className="record-list-heading"><h3>Team</h3><span>{data.length} accounts</span></div>
        {isLoading ? <p className="record-empty">Loading staff…</p>
          : data.length ? <div className="record-list">
              {data.map(member => <StaffRow key={member.id} member={member}
                busy={activeMutation.isPending}
                isSelf={member.email === session?.user.email}
                onDeactivate={() => setDeactivating(member)}
                onRestore={() => activeMutation.mutate({ id: member.id, active: true })} />)}
            </div>
          : <p className="record-empty">No accounts yet.</p>}
      </section>

      {deactivating && (
        <ConfirmDialog
          title={`Deactivate ${deactivating.name}?`}
          message={<>
            They will not be able to sign in. Everything they have already recorded stays
            in the patient's history, under their name. You can restore the account later.
          </>}
          confirmLabel="Deactivate" danger
          busy={activeMutation.isPending}
          onClose={() => setDeactivating(null)}
          onConfirm={() => activeMutation.mutate({ id: deactivating.id, active: false })} />
      )}
    </>
  )
}
