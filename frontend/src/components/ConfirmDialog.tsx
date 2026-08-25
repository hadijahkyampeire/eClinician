import type { ReactNode } from 'react'
import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material'

/**
 * The pause before something that is hard to take back.
 *
 * It says what will happen in the clinic's own terms rather than "Are you sure?" — the
 * useful question is not whether you are sure, it is what you are about to cause. The
 * confirming button carries the verb, so the choice is readable without the sentence.
 *
 * While the action is in flight the dialog stays open and refuses to close: the backdrop
 * and Escape are wired to nothing, so a stray click cannot leave you wondering whether
 * the deactivation went through.
 */
export default function ConfirmDialog({
  title, message, confirmLabel, danger, busy, error, disabled, children, onConfirm, onClose,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  /** Red confirm button, for anything that removes access or data. */
  danger?: boolean
  busy?: boolean
  error?: string
  /** Set when the extra fields below are not filled in yet. */
  disabled?: boolean
  /** Anything the action needs collecting first — a reason, a note. */
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={busy ? undefined : onClose}
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <DialogContentText component="div">{message}</DialogContentText>
        {children}
        {error && <p className="patient-error">{error}</p>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color={danger ? 'error' : 'primary'}
          disabled={busy || disabled} onClick={onConfirm}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
