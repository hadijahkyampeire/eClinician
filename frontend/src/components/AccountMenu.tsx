import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ButtonBase, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '../auth/AuthContext'
import PasswordChangeModal from './PasswordChangeModal'

/**
 * The signed-in user in the topbar, and what they can do about it. Both shells wear it:
 * the clinical layout, where it links to a profile page, and the platform console, where
 * there is no profile to link to and the item is simply left out.
 */
export default function AccountMenu({ subtitle, profilePath }: {
  subtitle?: string
  profilePath?: string
}) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  function handleLogout() {
    setAnchor(null)
    logout()
    navigate('/login')
  }

  return (
    <div className="account-menu">
      <ButtonBase className="account-trigger" aria-haspopup="menu"
        aria-controls={anchor ? 'account-menu' : undefined}
        aria-expanded={Boolean(anchor)}
        onClick={event => setAnchor(event.currentTarget)}>
        <div className="user-meta">
          <div className="name">{session?.user.name}</div>
          <div className="role">{subtitle ?? session?.user.role}</div>
        </div>
        <div className="avatar">
          {session?.user.profileImage
            ? <img src={session.user.profileImage} alt="" />
            : session?.user.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <KeyboardArrowDownIcon className={anchor ? 'open' : ''} fontSize="small" />
      </ButtonBase>

      <Menu id="account-menu" anchorEl={anchor} open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } },
          list: { 'aria-label': 'Account options', sx: { py: 0.75 } },
        }}>
        {profilePath && (
          <MenuItem onClick={() => { setAnchor(null); navigate(profilePath) }}>
            <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>View profile</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setAnchor(null); setChangingPassword(true) }}>
          <ListItemIcon><LockResetOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change password</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main',
          '& .MuiListItemIcon-root': { color: 'inherit' } }}>
          <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>

      {changingPassword && <PasswordChangeModal onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
