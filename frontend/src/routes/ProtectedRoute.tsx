import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { ReactNode } from 'react';
import type { Role } from '../auth/AuthContext';

/**
 * Signed out -> the login page. Signed in but wrong role -> back to the dashboard,
 * so typing /pharmacy as a receptionist gets you nowhere. This is convenience, not
 * security: the API refuses the same call independently (@PreAuthorize).
 */
export default function ProtectedRoute({ children, roles }: {
  children: ReactNode
  roles?: Role[]
}) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(session.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
