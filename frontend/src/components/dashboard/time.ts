/** How long someone has been standing there, which is the number a front desk wants. */
export function since(iso: string | null): string | null {
  if (!iso) return null
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

/**
 * The same wait as h:mm, for the queue table where it sits in brackets beside the clock
 * time and has to stay narrow: 0:45, 2:05.
 */
export function elapsed(iso: string | null): string | null {
  if (!iso) return null
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

export function atTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
