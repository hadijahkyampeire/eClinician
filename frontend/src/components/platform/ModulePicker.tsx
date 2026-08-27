import { Checkbox, FormControlLabel, FormGroup, FormHelperText, FormLabel } from '@mui/material'
import type { ModuleKey } from '../../auth/AuthContext'
import { CORE_MODULES, MODULES } from '../../types/tenant'

/**
 * The subscription itself: the modules this hospital's staff will find in their nav.
 * Core modules are shown ticked and locked — they are what the system is, not an extra.
 */
export default function ModulePicker({ selected, onChange }: {
  selected: ModuleKey[]
  onChange: (modules: ModuleKey[]) => void
}) {
  const toggle = (module: ModuleKey) => onChange(selected.includes(module)
    ? selected.filter((value) => value !== module)
    : [...selected, module])

  return (
    <div>
      <FormLabel component="legend" sx={{ fontSize: 13, fontWeight: 600 }}>Subscription</FormLabel>
      <FormGroup row sx={{ gap: 1, mt: 0.5 }}>
        {MODULES.map((module) => (
          <FormControlLabel key={module.key} label={module.label} disabled={module.core}
            control={<Checkbox size="small" disabled={module.core}
              checked={module.core || selected.includes(module.key)}
              onChange={() => toggle(module.key)} />} />
        ))}
      </FormGroup>
      <FormHelperText>
        {CORE_MODULES.length} core modules are included with every hospital and cannot be
        turned off. The rest are optional.
      </FormHelperText>
    </div>
  )
}
