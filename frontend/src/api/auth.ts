import type { Tenant } from '../auth/AuthContext'

import { API_URL } from './config'
import { request } from './http'
import { getRefreshToken } from './session'

/** Mirrors LoginResponse on the API. */
export interface LoginResult {
  token: string
  /** Spent for a new pair when the token above expires. */
  refreshToken: string
  expiresInSeconds: number
  name: string
  email: string
  role: string
  profileImage: string | null
  tenantId: string | null
  platformAdmin: boolean
  /** The hospital's branding and subscription, read from the tenants table. */
  tenant: Tenant | null
}

export interface Profile {
  name: string
  email: string
  role: string
  profileImage: string | null
}

export function getProfile() {
  return request<Profile>('/api/auth/profile', {}, 'Could not load your profile')
}

export function updateProfile(name: string, profileImage: string | null) {
  return request<Profile>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name, profileImage }),
  }, 'Could not update your profile')
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
  await request<void>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  }, 'Could not change the password')
}

/**
 * Tears up the refresh token on the server, so a signed-out browser cannot renew its
 * way back in. Signing out locally must not depend on this working, so a failure here
 * is deliberately swallowed — the tokens are dropped either way.
 */
export async function revokeSession() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined)
}
