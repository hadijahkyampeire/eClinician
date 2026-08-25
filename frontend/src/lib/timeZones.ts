/**
 * Every IANA zone the browser knows, and the one it is in.
 *
 * `Intl.supportedValuesOf` is the standard list, so nothing is hard-coded and nothing goes
 * stale — but it is newer than the rest of the app's baseline, so a browser without it
 * falls back to offering just the local zone rather than an empty picker.
 */
const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }

export const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export const TIME_ZONES: string[] = (() => {
  try {
    const all = intl.supportedValuesOf?.('timeZone')
    return all?.length ? all : [BROWSER_ZONE]
  } catch {
    return [BROWSER_ZONE]
  }
})()

/** "Africa/Kampala" reads better as "Kampala · Africa" when you are scanning a list. */
export function zoneLabel(zone: string) {
  const [area, ...rest] = zone.split('/')
  return rest.length ? `${rest.join('/').replace(/_/g, ' ')} · ${area}` : zone
}

/** The local time there right now, which is the only way to be sure it is the right one. */
export function timeIn(zone: string) {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: zone, timeStyle: 'short' })
      .format(new Date())
  } catch {
    return ''
  }
}
