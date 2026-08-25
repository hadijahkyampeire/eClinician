import { useNavigate } from 'react-router-dom'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '../auth/AuthContext'

/** The floor of either sidebar: the one action that is always one click away. */
export default function SidebarSignOut() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="sidebar-footer">
      <button type="button" className="sign-out"
        onClick={() => { logout(); navigate('/login') }}>
        <span className="icon"><LogoutOutlinedIcon fontSize="small" /></span>
        Log out
      </button>
    </div>
  )
}
