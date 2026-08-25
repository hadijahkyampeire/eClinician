import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getProfile, updateProfile } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import PasswordChangeModal from '../components/PasswordChangeModal'
import '../styles/profile.css'

const MAX_IMAGE_BYTES = 512 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function Profile() {
  const { session, updateUser } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(session?.user.name ?? '')
  const [image, setImage] = useState<string | null>(session?.user.profileImage ?? null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile })

  const save = useMutation({
    mutationFn: () => updateProfile(name.trim(), image),
    onSuccess: data => {
      updateUser({ name: data.name, profileImage: data.profileImage })
      setMessage('Your profile has been updated.')
      setError('')
    },
    onError: err => {
      setMessage('')
      setError(err instanceof Error ? err.message : 'Could not update your profile')
    },
  })

  function choosePhoto(file?: File) {
    if (!file) return
    setMessage('')
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('The profile photo must be smaller than 512 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const initial = name.trim()[0]?.toUpperCase() || '?'

  return (
    <section className="profile-page">
      <div className="page-header">
        <h2>Your profile</h2>
        <p>{session?.tenant?.name
          ? `Manage how your account appears to colleagues at ${session.tenant.name}.`
          : 'Manage how your account appears across the platform.'}</p>
      </div>

      {profile.isError && <div className="notice error">Could not load your latest profile.</div>}
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <div className="profile-grid">
        <div className="card profile-photo-card">
          <div className="profile-photo">
            {image ? <img src={image} alt="Profile" /> : <span>{initial}</span>}
          </div>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden
            onChange={event => choosePhoto(event.target.files?.[0])} />
          <button className="btn secondary" type="button" onClick={() => fileInput.current?.click()}>
            Upload photo
          </button>
          {image && <button className="profile-remove" type="button" onClick={() => setImage(null)}>
            Remove photo
          </button>}
          <small>PNG, JPEG, or WebP · maximum 512 KB</small>
        </div>

        <form className="card profile-details" onSubmit={event => { event.preventDefault(); save.mutate() }}>
          <h3>Personal details</h3>
          <label>Display name
            <input value={name} maxLength={150} required onChange={event => setName(event.target.value)} />
          </label>
          <label>Email address
            <input value={profile.data?.email ?? session?.user.email ?? ''} disabled />
            <small>Your email is your secured login identity. An administrator can change it.</small>
          </label>
          <label>Role
            <input disabled value={session?.isPlatformAdmin ? 'Platform Super Admin'
              : profile.data?.role ?? session?.user.role ?? ''} />
          </label>
          <div className="profile-actions">
            <button type="button" className="btn secondary" onClick={() => setChangingPassword(true)}>
              Change password
            </button>
            <button type="submit" className="btn" disabled={!name.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
      {changingPassword && <PasswordChangeModal onClose={() => setChangingPassword(false)} />}
    </section>
  )
}
