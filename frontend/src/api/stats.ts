import { request } from './http'
import type { DashboardStats } from '../types/stats'

export function getDashboardStats() {
  return request<DashboardStats>('/api/stats/dashboard', undefined,
    'Could not load dashboard stats')
}
