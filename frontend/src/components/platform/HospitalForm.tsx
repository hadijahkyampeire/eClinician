import { useState, type FormEvent } from 'react'
import type { ModuleKey } from '../../auth/AuthContext'
import { MODULES, type Hospital, type HospitalForm as Form } from '../../types/tenant'

interface Props {
  hospital: Hospital | null
  isSaving: boolean
  error?: string
  onClose: () => void
  onSave: (form: Form) => void
}

/** Onboarding a hospital, and deciding which modules its subscription includes. */
export default function HospitalForm({ hospital, isSaving, error, onClose, onSave }: Props) {
  const [form, setForm] = useState<Form>({
    id: hospital?.id || '',
    name: hospital?.name || '',
    primaryColor: hospital?.primaryColor || '#0f766e',
    modules: hospital?.enabledModules || ['patients', 'appointments', 'records'],
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })
  const onboarding = !hospital
  const set = <K extends keyof Form>(field: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [field]: value }))

  function toggle(module: ModuleKey) {
    set('modules', form.modules.includes(module)
      ? form.modules.filter((value) => value !== module)
      : [...form.modules, module])
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="hospital-title">
        <div className="modal-header">
          <h3 id="hospital-title">{hospital ? 'Edit hospital' : 'Onboard a hospital'}</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>Hospital name
            <input required maxLength={150} value={form.name}
              onChange={(event) => set('name', event.target.value)} />
          </label>
          <label>Identifier
            <input required value={form.id} disabled={Boolean(hospital)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and hyphens"
              placeholder="st-marys-hospital"
              onChange={(event) => set('id', event.target.value)} />
            <small>{hospital
              ? 'Fixed: it is written into every row this hospital owns.'
              : 'Lowercase, hyphenated. It cannot be changed afterwards.'}</small>
          </label>
          <label>Brand colour
            <input type="color" value={form.primaryColor}
              onChange={(event) => set('primaryColor', event.target.value)} />
          </label>

          <fieldset className="module-toggles">
            <legend>Subscription</legend>
            {MODULES.map((module) => (
              <label key={module.key}>
                <input type="checkbox" checked={form.modules.includes(module.key)}
                  onChange={() => toggle(module.key)} />
                {module.label}
              </label>
            ))}
          </fieldset>

          {onboarding && (
            <fieldset className="module-toggles">
              <legend>First administrator</legend>
              <small>
                They sign in immediately and add the rest of the clinic's staff themselves.
              </small>
              <input required maxLength={150} placeholder="Full name" value={form.adminName}
                onChange={(event) => set('adminName', event.target.value)} />
              <input required type="email" maxLength={200} placeholder="Email"
                value={form.adminEmail}
                onChange={(event) => set('adminEmail', event.target.value)} />
              <input required type="password" minLength={8} placeholder="Password (8+ characters)"
                value={form.adminPassword}
                onChange={(event) => set('adminPassword', event.target.value)} />
            </fieldset>
          )}

          {error && <p className="patient-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn"
              disabled={isSaving || !form.name.trim() || !form.id.trim()
                || (onboarding && !form.adminEmail?.trim())}>
              {isSaving ? 'Saving...' : hospital ? 'Save changes' : 'Onboard hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
