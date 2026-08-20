import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  createHospital,
  getHospitals,
  getPlatformStats,
  setHospitalActive,
  updateHospital,
} from '../api/platform'
import { useAuth } from '../auth/AuthContext'
import HospitalForm from '../components/platform/HospitalForm'
import HospitalTable from '../components/platform/HospitalTable'
import type { Hospital, HospitalForm as Form } from '../types/tenant'

/** The platform console: onboard hospitals and decide what each one has bought. */
export default function PlatformAdmin() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Hospital | null | undefined>(undefined)

  const stats = useQuery({ queryKey: ['platform-stats'], queryFn: getPlatformStats })
  const hospitals = useQuery({ queryKey: ['hospitals'], queryFn: getHospitals })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hospitals'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] }),
    ])
  }
  const save = useMutation({
    mutationFn: (form: Form) => editing
      ? updateHospital(editing.id, form)
      : createHospital(form),
    onSuccess: async () => { setEditing(undefined); await refresh() },
  })
  const toggle = useMutation({
    mutationFn: (hospital: Hospital) => setHospitalActive(hospital.id, !hospital.active),
    onSuccess: refresh,
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const error = hospitals.error || stats.error || toggle.error

  return (
    <div className="content">
      <div className="page-header appointment-page-header">
        <div>
          <h2>eClinician Admin — System Oversight</h2>
          <p>Signed in as {session?.user.name} (Platform Super Admin)</p>
        </div>
        <div className="appointment-context-actions">
          <button className="btn" onClick={() => setEditing(null)}>Onboard hospital</button>
          <button className="btn ghost" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Hospitals</div>
          <div className="value">{stats.data?.hospitals ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Hospitals</div>
          <div className="value">{stats.data?.activeHospitals ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Platform Users</div>
          <div className="value">{stats.data?.users ?? '—'}</div>
        </div>
      </div>

      {error && <p className="patient-error">{error.message}</p>}

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Hospitals</h3>
            <p>Suspending a hospital keeps its data and stops its staff signing in.</p>
          </div>
          <span>{hospitals.data?.length ?? 0} onboarded</span>
        </div>
        <HospitalTable
          hospitals={hospitals.data ?? []}
          busy={toggle.isPending}
          onEdit={setEditing}
          onToggleActive={(hospital) => toggle.mutate(hospital)}
        />
      </section>

      {editing !== undefined && (
        <HospitalForm
          hospital={editing}
          isSaving={save.isPending}
          error={save.error?.message}
          onClose={() => { save.reset(); setEditing(undefined) }}
          onSave={(form) => save.mutate(form)}
        />
      )}
    </div>
  )
}
