import { API_URL } from './config'

/** Mirrors LoginResponse on the API. */
export interface LoginResult {
  token: string
  expiresInSeconds: number
  name: string
  email: string
  role: string
  tenantId: string | null
  platformAdmin: boolean
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(details?.message || 'Could not sign in')
  }
  return response.json()
}
