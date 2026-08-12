const TOKEN_KEY = 'eclinician.token'

/**
 * The signed token from POST /api/auth/login. It carries the tenant, so no API
 * call needs to say which hospital it means any more.
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
