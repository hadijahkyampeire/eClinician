import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../api/auth'
import PasswordInput from './PasswordInput'

/** Self-service: the account owner changes their own password, current one required. */
export default function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const save = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => setDone(true),
  })
  const mismatch = confirm !== '' && next !== confirm
  const canSubmit = current !== '' && next.length >= 8 && !mismatch && !save.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canSubmit) save.mutate()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <div className="modal-header">
          <h3 id="password-title">Change password</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {done ? (
          <form className="appointment-form" onSubmit={(e) => { e.preventDefault(); onClose() }}>
            <p>Your password has been changed. It applies the next time you sign in.</p>
            <div className="modal-actions">
              <button type="submit" className="btn">Done</button>
            </div>
          </form>
        ) : (
          <form className="appointment-form" onSubmit={handleSubmit}>
            <label>Current password
              <PasswordInput autoComplete="current-password" required value={current}
                onChange={(event) => setCurrent(event.target.value)} />
            </label>
            <label>New password
              <PasswordInput autoComplete="new-password" required minLength={8} value={next}
                onChange={(event) => setNext(event.target.value)} />
              <small>At least 8 characters.</small>
            </label>
            <label>Confirm new password
              <PasswordInput autoComplete="new-password" required value={confirm}
                onChange={(event) => setConfirm(event.target.value)} />
            </label>

            {mismatch && <p className="patient-error">The two new passwords do not match.</p>}
            {save.error && <p className="patient-error">{save.error.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn" disabled={!canSubmit}>
                {save.isPending ? 'Saving...' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
