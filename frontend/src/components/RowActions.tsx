import { useState, type MouseEvent, type ReactNode } from 'react'
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'

export interface RowAction {
  label: string
  icon?: ReactNode
  /** Drawn in red, and always placed last so it is never the click you meant to make. */
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * A row's actions, behind one button.
 *
 * Anything that removes access or data lives in here rather than on the row itself. A
 * Deactivate sitting in the open is one mis-click from happening; behind a menu it takes
 * a deliberate second click, and the confirmation after it a third.
 */
export default function RowActions({ actions, label = 'Actions' }: {
  actions: RowAction[]
  label?: string
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const shown = actions.filter(Boolean)
  if (!shown.length) return null

  function open(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setAnchor(event.currentTarget)
  }

  return (
    <>
      <Tooltip title={label}>
        <IconButton size="small" aria-label={label} onClick={open}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        onClick={(event) => event.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 190, borderRadius: 2 } } }}>
        {/* Destructive last: the pointer lands on the safe items first. */}
        {[...shown].sort((a, b) => Number(a.danger) - Number(b.danger)).map((action) => (
          <MenuItem key={action.label} disabled={action.disabled}
            onClick={() => { setAnchor(null); action.onClick() }}
            sx={action.danger
              ? { color: 'error.main', '& .MuiListItemIcon-root': { color: 'inherit' } }
              : undefined}>
            {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
