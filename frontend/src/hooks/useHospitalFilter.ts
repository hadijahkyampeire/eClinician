import { useSearchParams } from 'react-router-dom'

/** The selected hospital, kept in the URL so the filtered view is linkable. */
export function useHospitalFilter() {
  const [params, setParams] = useSearchParams()
  const hospitalId = params.get('hospital') ?? ''

  const setHospitalId = (next: string) => {
    if (next) params.set('hospital', next)
    else params.delete('hospital')
    setParams(params, { replace: true })
  }

  const matches = <T extends { hospitalId: string }>(rows: T[] | undefined) =>
    (rows ?? []).filter((row) => !hospitalId || row.hospitalId === hospitalId)

  return { hospitalId, setHospitalId, matches }
}
