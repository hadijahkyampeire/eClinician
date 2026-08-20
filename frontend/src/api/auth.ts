import type { Tenant } from '../auth/AuthContext'

import { API_URL } from './config'
import { authHeaders } from './session'

/** Mirrors LoginResponse on the API. */
export interface LoginResult {
  token: string
  expiresInSeconds: number
  name: string
  email: string
  role: string
  tenantId: string | null
  platformAdmin: boolean
  /** The hospital's branding and subscription, read from the tenants table. */
  tenant: Tenant | null
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

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await fetch(`${API_URL}/api/auth/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const message = details?.message || Object.values(details || {})[0]
    throw new Error(typeof message === 'string' ? message : 'Could not change the password')
  }
}
