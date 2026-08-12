import { createContext, useContext, useState, type ReactNode } from 'react';
import { clearToken, getToken, setToken } from '../api/session';

export type Role =
  | 'Administrator'
  | 'Clinician'
  | 'Receptionist'
  | 'Pharmacist'
  | 'Lab Technician';

export type ModuleKey =
  | 'patients'
  | 'appointments'
  | 'records'
  | 'pharmacy'
  | 'laboratory';

export interface User {
  name: string;
  email: string;
  role: Role;
}

export interface Tenant {
  id: string;
  name: string;
  primaryColor: string;
  secondaryLogoUrl?: string;
  enabledModules: ModuleKey[];
}

export interface Session {
  user: User;
  isPlatformAdmin: boolean;
  tenant: Tenant | null;
}

interface AuthContextValue {
  session: Session | null;
  login: (session: Session, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'eclinician.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Session) : null;
      // A session without a token is left over from before login was real: the UI
      // would look signed in while every API call came back 401.
      return parsed?.user?.role && getToken() ? parsed : null;
    } catch {
      return null;
    }
  });

  // The session is what the UI renders; the token is what the API trusts. Login.tsx
  // builds both from POST /api/auth/login.
  function login(next: Session, token: string) {
    setToken(token);
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function logout() {
    clearToken();
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// This hook lives beside its provider to keep the small demo auth setup simple.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
