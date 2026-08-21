import { useEffect, useRef, useState } from 'react'
import { endSession } from '../api/http'
import { getExpiry } from '../api/session'
import { useAuth } from '../auth/AuthContext'

/** How long before the end the offer appears, and how recently counts as still here. */
const WARN_AT = 2 * 60 * 1000
const ACTIVE_WITHIN = 5 * 60 * 1000
const ACTIVITY = ['mousedown', 'keydown', 'scroll', 'touchstart']

/**
 * Watches the clock on the access token so a session ends visibly rather than as a wall
 * of failed requests. Somebody working gets the last two minutes offered back to them;
 * somebody who walked away is signed out, which is the point of the session ending.
 */
export default function SessionExpiry() {
  const { session, logout, renew } = useAuth()
  const lastActive = useRef(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [renewing, setRenewing] = useState(false)

  useEffect(() => {
    const seen = () => { lastActive.current = Date.now() }
    seen()
    ACTIVITY.forEach((event) => window.addEventListener(event, seen, { passive: true }))
    return () => ACTIVITY.forEach((event) => window.removeEventListener(event, seen))
  }, [])

  useEffect(() => {
    if (!session) return

    const timer = setInterval(() => {
      const expiry = getExpiry()
      // Nothing to count down to: a session stored before tokens carried an expiry.
      // The 401 handler still catches those.
      if (!expiry) return setRemaining(null)

      const left = expiry - Date.now()
      if (left <= 0) {
        setRemaining(null)
        return endSession()
      }
      const active = Date.now() - lastActive.current < ACTIVE_WITHIN
      setRemaining(left <= WARN_AT && active ? left : null)
    }, 1000)

    return () => clearInterval(timer)
  }, [session])

  if (!session || remaining === null) return null

  const seconds = Math.ceil(remaining / 1000)
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  async function keepWorking() {
    setRenewing(true)
    // A failure here has already ended the session; the redirect to /login follows.
    if (await renew()) setRemaining(null)
    setRenewing(false)
  }

  function signOut() {
    setRemaining(null)
    logout()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="alertdialog" aria-modal="true"
        aria-labelledby="session-title">
        <div className="modal-header">
          <h3 id="session-title">Still there?</h3>
        </div>
        <p>
          Your session ends in <strong>{clock}</strong>. Carry on and nothing you have
          open is lost; do nothing and you will be signed out.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={signOut}>Sign out</button>
          <button type="button" className="btn" disabled={renewing} onClick={keepWorking}>
            {renewing ? 'Just a moment...' : 'Keep working'}
          </button>
        </div>
      </div>
    </div>
  )
}
