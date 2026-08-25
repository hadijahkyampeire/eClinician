/**
 * Orders are stored as they always were: one per line on the encounter, which is what the
 * pharmacy and the lab split into rows when a visit is finalized. The picker is a way of
 * writing those lines, not a new place to keep them — so nothing downstream changed, and
 * an encounter written before the catalogue existed still opens.
 *
 * A prescription line is "medicine – how to take it". The separator is an en dash with
 * spaces, which is not something anyone types into a medicine name by accident.
 */
export const SEPARATOR = ' – '

export interface OrderLine {
  name: string
  /** Dose and instructions. Prescriptions use it; lab requests leave it empty. */
  detail: string
}

export function parseLines(text: string): OrderLine[] {
  return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const at = line.indexOf(SEPARATOR)
    return at === -1
      ? { name: line, detail: '' }
      : { name: line.slice(0, at).trim(), detail: line.slice(at + SEPARATOR.length).trim() }
  })
}

export function formatLines(lines: OrderLine[]): string {
  return lines
    .filter(line => line.name.trim())
    .map(line => line.detail.trim()
      ? `${line.name.trim()}${SEPARATOR}${line.detail.trim()}`
      : line.name.trim())
    .join('\n')
}
