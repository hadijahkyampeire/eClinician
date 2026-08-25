import { countryLabel } from '../../lib/countries'
import type { HospitalAddress } from '../../types/tenant'

/** A hospital's address on one line, skipping whatever was never recorded. */
export default function HospitalLocation({ hospital }: { hospital: HospitalAddress }) {
  const place = [hospital.city, hospital.subdivision, countryLabel(hospital.country)]
    .filter(Boolean).join(' · ')
  if (!place) return <span className="not-recorded">Not recorded</span>
  return (
    <span className="hospital-location">
      {place}
      {hospital.addressLine && <small>{hospital.addressLine}</small>}
    </span>
  )
}
