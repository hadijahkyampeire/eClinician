import { Chip, Stack } from '@mui/material'
import { MODULES, type Hospital } from '../../types/tenant'

/** A hospital's subscription, drawn as what it has rather than what it lacks. */
export default function ModuleChips({ hospital }: { hospital: Hospital }) {
  const all = hospital.enabledModules.length === MODULES.length
  if (all) return <Chip size="small" color="success" variant="outlined" label="All modules" />
  if (!hospital.enabledModules.length) {
    return <Chip size="small" variant="outlined" label="No modules" />
  }
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {MODULES.filter((module) => hospital.enabledModules.includes(module.key)).map((module) => (
        <Chip key={module.key} size="small" variant="outlined" label={module.label} />
      ))}
    </Stack>
  )
}
