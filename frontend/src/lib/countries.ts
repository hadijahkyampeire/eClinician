import { getCountries, type CountryCode } from 'libphonenumber-js'

export interface Country {
  code: CountryCode
  name: string
  flag: string
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })

/**
 * Every country in the world, once, sorted by the name a person would search for.
 *
 * The list comes from libphonenumber-js — already a dependency for patient phone numbers —
 * and the names from the browser's own Intl data, so nothing is hard-coded and nothing
 * goes stale. The flag is the two letters shifted into the regional-indicator block.
 */
export const COUNTRIES: Country[] = getCountries()
  .map((code) => ({
    code,
    name: displayNames.of(code) || code,
    flag: code.replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code as string, country]))

export const countryOf = (code: string | null | undefined) =>
  code ? BY_CODE.get(code.toUpperCase()) : undefined

/** "🇺🇬 Uganda" for a stored code, or the code itself if it is one we do not know. */
export function countryLabel(code: string | null | undefined) {
  const country = countryOf(code)
  return country ? `${country.flag} ${country.name}` : code || ''
}
