import { useState, type InputHTMLAttributes } from 'react'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'

/** A password box with an eye button, so what was typed can be checked before submitting. */
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false)
  const label = shown ? 'Hide password' : 'Show password'

  return (
    <span className="password-field">
      <input {...props} type={shown ? 'text' : 'password'} />
      <button type="button" className="password-toggle" onClick={() => setShown(!shown)}
        aria-label={label} aria-pressed={shown} title={label}>
        {shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </button>
    </span>
  )
}
