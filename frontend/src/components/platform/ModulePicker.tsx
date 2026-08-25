import { Checkbox, FormControlLabel, FormGroup, FormLabel } from '@mui/material'
import type { ModuleKey } from '../../auth/AuthContext'
import { MODULES } from '../../types/tenant'

/** The subscription itself: the modules this hospital's staff will find in their nav. */
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
          <FormControlLabel key={module.key} label={module.label}
            control={<Checkbox size="small" checked={selected.includes(module.key)}
              onChange={() => toggle(module.key)} />} />
        ))}
      </FormGroup>
    </div>
  )
}
