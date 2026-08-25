import type { Role } from '../../auth/AuthContext'

/**
 * Which part of the clinic a role works in, and the colour that part wears.
 *
 * The colours are the product palette in index.css, never raw hex — a department gets a
 * colour of its own without any screen leaving the product. This lives beside the
 * dashboard views but is read by the layout too: the accent is set once on `.layout`, so
 * the sidebar, the nav, the calendar, the avatar and the mark all wear it, not just the
 * dashboard in the middle.
 */
export const DEPARTMENTS: Record<Role, { name: string; accent: string }> = {
  Receptionist: { name: 'Front Desk', accent: 'var(--navy)' },
  Clinician: { name: 'Consulting Room', accent: 'var(--teal)' },
  'Lab Technician': { name: 'Laboratory', accent: 'var(--sea)' },
  Pharmacist: { name: 'Pharmacy', accent: 'var(--forest)' },
  Administrator: { name: 'Administration', accent: 'var(--ink)' },
}
