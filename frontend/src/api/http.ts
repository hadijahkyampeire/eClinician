import { API_URL } from './config'
import { authHeaders, clearTokens, getRefreshToken, saveTokens } from './session'

/** Told to whoever is holding the UI together, so the screen can follow the session. */
let onExpired: () => void = () => {}

export function whenSessionExpires(handler: () => void) {
  onExpired = handler
}

let renewal: Promise<boolean> | null = null

/**
 * Trades the refresh token for a new pair.
 *
 * <p>One exchange at a time. Refresh tokens rotate — the old one is spent the moment it
 * is used — so two calls racing would send the second to a token the server has already
 * torn up, and the API would read that as a stolen token and end every session.
 */
export function renewSession(): Promise<boolean> {
  if (!renewal) renewal = exchange().finally(() => { renewal = null })
  return renewal
}

async function exchange(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) return false
    saveTokens(await response.json())
    return true
  } catch {
    // A network failure is not an expiry: the session may still be perfectly good once
    // the API answers again, so nobody is signed out over it.
    return false
  }
}

/** Drops the tokens and lets the app know, so the UI stops pretending to be signed in. */
export function endSession() {
  clearTokens()
  onExpired()
}

function send(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
}

/**
 * Every call the signed-in app makes goes through here, which is what makes expiry a
 * single behaviour rather than eleven. A 401 buys one silent renewal and one retry;
 * if that fails the session is over and the app is told once, instead of each screen
 * inventing its own error.
 */
export async function request<T>(
  path: string,
  options?: RequestInit,
  fallback = 'Request failed',
): Promise<T> {
  let response = await send(path, options)

  if (response.status === 401 && (await renewSession())) {
    response = await send(path, options)
  }
  if (response.status === 401) {
    endSession()
    throw new Error('Your session has ended. Please sign in again.')
  }

  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : fallback)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}
