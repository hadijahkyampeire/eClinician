const TOKEN_KEY = 'eclinician.token'
const REFRESH_KEY = 'eclinician.refresh'
const EXPIRES_KEY = 'eclinician.expires'

/** The shape of what POST /api/auth/login and /api/auth/refresh both hand back. */
export interface Tokens {
  token: string
  refreshToken: string
  expiresInSeconds: number
}

/**
 * The signed token from the API. It carries the tenant, so no API call needs to say
 * which hospital it means.
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/** Spent for a new pair when the one above runs out. Never sent as a header. */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

/** When the access token dies, as epoch milliseconds — or null if nothing is stored. */
export function getExpiry(): number | null {
  const stored = localStorage.getItem(EXPIRES_KEY)
  const parsed = stored ? Number(stored) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

/** Written on sign-in and again on every renewal, since both rotate the pair. */
export function saveTokens({ token, refreshToken, expiresInSeconds }: Tokens) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  localStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresInSeconds * 1000))
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
