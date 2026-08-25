import { Chip } from '@mui/material'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import RowActions from '../RowActions'
import type { Staff } from '../../types/staff'

/**
 * One account. Deactivating is behind the menu, not on the row: it is the one thing here
 * that takes someone's access away, and it should cost a deliberate click to reach.
 * Nobody can deactivate themselves — that is a lock-out, not a decision.
 */
export default function StaffRow({ member, busy, isSelf, onDeactivate, onRestore }: {
  member: Staff
  busy: boolean
  isSelf: boolean
  onDeactivate: () => void
  onRestore: () => void
}) {
  return (
    <div className="record-row">
      <div>
        <b>{member.name}{isSelf && <span className="staff-you"> · you</span>}</b>
        <small>{member.email} · {member.specialty || member.roleLabel}</small>
      </div>
      <div className="record-row-trailing">
        <Chip size="small" label={member.active ? 'Active' : 'Deactivated'}
          color={member.active ? 'success' : 'default'}
          variant={member.active ? 'filled' : 'outlined'} />
        {!isSelf && (
          <RowActions label={`Actions for ${member.name}`} actions={member.active
            ? [{ label: 'Deactivate account', danger: true, disabled: busy,
                icon: <PersonOffOutlinedIcon fontSize="small" />, onClick: onDeactivate }]
            : [{ label: 'Restore account', disabled: busy,
                icon: <RestartAltOutlinedIcon fontSize="small" />, onClick: onRestore }]} />
        )}
      </div>
    </div>
  )
}
