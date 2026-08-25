import { useQuery } from '@tanstack/react-query'
import {
  getHospitalFilterOptions, getHospitals, getPlatformPatients, getPlatformStaff,
  getPlatformStats,
} from '../api/platform'
import type { HospitalFilters } from '../types/tenant'

/**
 * The console's four reads, in one place. Every screen asks for what it needs by name and
 * React Query serves the rest from cache, so moving between them costs no extra requests.
 */
/**
 * The filters are part of the key, so each combination is cached on its own and going
 * back to one you have already used is instant. `placeholderData` keeps the previous
 * rows on screen while the next answer is in flight, so the table does not blink empty
 * on every keystroke.
 */
export const useHospitals = (filters?: HospitalFilters) =>
  useQuery({
    queryKey: ['hospitals', filters ?? null],
    queryFn: () => getHospitals(filters),
    placeholderData: (previous) => previous,
  })

/** Follows the chosen country, so the subdivision filter only offers reachable places. */
export const useHospitalFilterOptions = (country: string) =>
  useQuery({
    queryKey: ['hospital-locations', country],
    queryFn: () => getHospitalFilterOptions(country),
  })

export const usePlatformStats = () =>
  useQuery({ queryKey: ['platform-stats'], queryFn: getPlatformStats })

export const usePlatformStaff = () =>
  useQuery({ queryKey: ['platform-staff'], queryFn: getPlatformStaff })

export const usePlatformPatients = () =>
  useQuery({ queryKey: ['platform-patients'], queryFn: getPlatformPatients })
