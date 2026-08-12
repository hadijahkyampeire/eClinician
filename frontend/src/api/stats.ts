import { API_URL } from './config'
import { authHeaders } from './session'
import type { DashboardStats } from '../types/stats'

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/api/stats/dashboard`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Could not load dashboard stats')
  return response.json()
}
