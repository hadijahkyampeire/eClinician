import { useQuery } from '@tanstack/react-query'
import { getLabTests, getMedications } from '../api/catalog'

/**
 * The order catalogues. They are reference data that does not change during a shift, so
 * they are fetched once and held — a clinician opening ten encounters should not refetch
 * the medicine list ten times.
 */
const FOREVER = { staleTime: Infinity, gcTime: Infinity }

export const useMedications = () =>
  useQuery({ queryKey: ['catalog', 'medications'], queryFn: getMedications, ...FOREVER })

export const useLabTests = () =>
  useQuery({ queryKey: ['catalog', 'lab-tests'], queryFn: getLabTests, ...FOREVER })
