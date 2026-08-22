import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createStaff, getStaff, setStaffActive } from '../api/staff'
import StaffForm from '../components/staff/StaffForm'
import { useAuth } from '../auth/AuthContext'
import type { Staff as StaffMember, StaffForm as Form } from '../types/staff'

export default function Staff() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
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
    onSuccess: () => { setError(''); void refresh() },
    onError: fail,
  })

  return (
    <>
      <div className="page-header appointment-page-header">
        <div><h2>Staff</h2><p>Accounts for this facility</p></div>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>Add staff member</button>}
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
                onToggle={() => activeMutation.mutate({ id: member.id, active: !member.active })} />)}
            </div>
          : <p className="record-empty">No accounts yet.</p>}
      </section>
    </>
  )
}

function StaffRow({ member, busy, isSelf, onToggle }: {
  member: StaffMember; busy: boolean; isSelf: boolean; onToggle: () => void
}) {
  return <div className="record-row">
    <div>
      <b>{member.name}{isSelf && <span className="staff-you"> · you</span>}</b>
      <small>{member.email} · {member.roleLabel}</small>
    </div>
    <div>
      <span className={`record-status ${member.active ? 'dispensed' : 'unavailable'}`}>
        {member.active ? 'active' : 'deactivated'}
      </span>
      {!isSelf && <button className="btn ghost" disabled={busy} onClick={onToggle}>
        {member.active ? 'Deactivate' : 'Restore'}
      </button>}
    </div>
  </div>
}
