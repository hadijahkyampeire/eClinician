import { useState } from 'react'
import { STAFF_ROLES, type StaffForm as Form, type StaffRole } from '../../types/staff'

const empty: Form = { name: '', email: '', role: 'RECEPTIONIST', password: '' }

/** Add-a-colleague form. Kept beside the list rather than in a modal — it is short. */
export default function StaffForm({ busy, onSubmit, onCancel }: {
  busy: boolean
  onSubmit: (form: Form) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Form>(empty)
  const set = (field: keyof Form, value: string) =>
    setForm(current => ({ ...current, [field]: value }))

  const ready = form.name.trim() && form.email.trim() && form.password.length >= 8

  return (
    <form className="card staff-form" onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      <div className="staff-form-grid">
        <label>Full name
          <input value={form.name} onChange={e => set('name', e.target.value)} />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            autoComplete="off" />
        </label>
        <label>Role
          <select value={form.role} onChange={e => set('role', e.target.value as StaffRole)}>
            {STAFF_ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </label>
        <label>Temporary password
          <input type="password" value={form.password} autoComplete="new-password"
            onChange={e => set('password', e.target.value)} placeholder="At least 8 characters" />
        </label>
      </div>
      <div className="staff-form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready || busy}>
          {busy ? 'Adding…' : 'Add staff member'}
        </button>
      </div>
    </form>
  )
}
