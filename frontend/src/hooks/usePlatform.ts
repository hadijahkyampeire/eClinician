import { useQuery } from '@tanstack/react-query'
import {
  getHospitals, getPlatformPatients, getPlatformStaff, getPlatformStats,
} from '../api/platform'

/**
 * The console's four reads, in one place. Every screen asks for what it needs by name and
 * React Query serves the rest from cache, so moving between them costs no extra requests.
 */
export const useHospitals = () =>
  useQuery({ queryKey: ['hospitals'], queryFn: getHospitals })

export const usePlatformStats = () =>
  useQuery({ queryKey: ['platform-stats'], queryFn: getPlatformStats })

export const usePlatformStaff = () =>
  useQuery({ queryKey: ['platform-staff'], queryFn: getPlatformStaff })

export const usePlatformPatients = () =>
  useQuery({ queryKey: ['platform-patients'], queryFn: getPlatformPatients })
