import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getClinic, updateClinic } from '../api/clinic'
import { useAuth } from '../auth/AuthContext'
import { MODULES, type ClinicSettings } from '../types/tenant'

/** A hospital administrator's own clinic: what it is called, and the colour it wears. */
export default function ClinicSettings() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const clinic = useQuery({ queryKey: ['clinic', session?.tenant?.id], queryFn: getClinic })
  // Untouched fields follow whatever the API last said; editing one takes it over.
  const [edited, setEdited] = useState<Partial<ClinicSettings>>({})
  const name = edited.name ?? clinic.data?.name ?? ''
  const primaryColor = edited.primaryColor ?? clinic.data?.primaryColor ?? '#0f766e'
  const setName = (value: string) => setEdited(current => ({ ...current, name: value }))
  const setPrimaryColor = (value: string) =>
    setEdited(current => ({ ...current, primaryColor: value }))

  const save = useMutation({
    mutationFn: () => updateClinic({ name, primaryColor }),
    onSuccess: async () => {
      setEdited({})
      await queryClient.invalidateQueries({ queryKey: ['clinic'] })
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <>
      <div className="page-header">
        <h2>Clinic settings</h2>
        <p>How your clinic appears to everyone who signs in here</p>
      </div>

      <section className="card appointment-section">
        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>Clinic name
            <input required maxLength={150} value={name}
              onChange={(event) => setName(event.target.value)} />
            <small>Shown beside the HK CLINIC mark, as “HK CLINIC · {name || 'your clinic'}”.</small>
          </label>
          <label>Brand colour
            <input type="color" value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)} />
            <small>Applied the next time your staff sign in.</small>
          </label>

          <fieldset className="module-toggles">
            <legend>Your subscription</legend>
            {MODULES.map((module) => (
              <label key={module.key}>
                <input type="checkbox" disabled readOnly
                  checked={clinic.data?.enabledModules.includes(module.key) ?? false} />
                {module.label}
              </label>
            ))}
            <small>Modules are part of your plan — ask the platform team to change them.</small>
          </fieldset>

          {save.error && <p className="patient-error">{save.error.message}</p>}
          {save.isSuccess && <p className="record-success">Saved.</p>}
          <div className="modal-actions">
            <button type="submit" className="btn" disabled={save.isPending || !name.trim()}>
              {save.isPending ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
