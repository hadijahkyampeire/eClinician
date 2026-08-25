import { countryLabel } from '../../lib/countries'
import { timeIn } from '../../lib/timeZones'
import type { HospitalAddress } from '../../types/tenant'

/** A hospital's address on one line, skipping whatever was never recorded. */
export default function HospitalLocation({ hospital, clock }: {
  hospital: HospitalAddress
  /** Show the local time there — the fact behind every rota hour at this clinic. */
  clock?: string
}) {
  const place = [hospital.city, hospital.subdivision, countryLabel(hospital.country)]
    .filter(Boolean).join(' · ')
  if (!place && !clock) return <span className="not-recorded">Not recorded</span>
  return (
    <span className="hospital-location">
      {place}
      {clock && <small>{timeIn(clock)} local</small>}
      {!clock && hospital.addressLine && <small>{hospital.addressLine}</small>}
    </span>
  )
}
