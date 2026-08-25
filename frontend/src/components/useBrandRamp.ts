import { useEffect } from 'react'

/**
 * Paints the whole app in one accent, computed from two colours.
 *
 * Both ramps are set on the root rather than on a layout, because --dept is *computed*
 * from --brand at :root, and a value overridden further down the tree would never reach
 * that computation. --dept is the accent pulled most of the way towards the hospital's own
 * colour, so every surface carries both: the pharmacist's screens are green, and a
 * hospital branded purple turns all five departments purple-ward on their next sign-in.
 */
export function useBrandRamp(brand: string | undefined, accent: string | undefined) {
  useEffect(() => {
    const root = document.documentElement
    const dept = accent && `color-mix(in srgb, ${accent} 78%, ${brand ?? 'var(--teal)'})`
    const ramp: Record<string, string | undefined> = {
      '--brand': brand,
      '--brand-dark': brand && `color-mix(in srgb, ${brand} 82%, black)`,
      '--brand-light': brand && `color-mix(in srgb, ${brand} 62%, white)`,
      '--brand-bg': brand && `color-mix(in srgb, ${brand} 8%, white)`,
      '--dept': dept,
      '--dept-dark': dept && `color-mix(in srgb, ${dept} 80%, black)`,
      '--dept-light': dept && `color-mix(in srgb, ${dept} 62%, white)`,
      '--dept-bg': dept && `color-mix(in srgb, ${dept} 12%, white)`,
    }
    Object.entries(ramp).forEach(([name, value]) => value && root.style.setProperty(name, value))
    return () => Object.keys(ramp).forEach(name => root.style.removeProperty(name))
  }, [brand, accent])
}
