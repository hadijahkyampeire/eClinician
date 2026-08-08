import { API_URL } from './config'
import type { DashboardStats } from '../types/stats'

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/api/stats/dashboard`, {
    headers: { 'X-Tenant-Id': tenantId },
  })
  if (!response.ok) throw new Error('Could not load dashboard stats')
  return response.json()
}
