import { useEffect, useState } from 'react'

/**
 * The value, but only once it has stopped changing. Typing into the hospital search
 * would otherwise send a request per keystroke, and the answers could arrive out of order.
 */
export function useDebounced<T>(value: T, delayMs = 300) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
