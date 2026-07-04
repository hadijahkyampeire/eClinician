import { createContext, useContext, useState, type ReactNode } from 'react';

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
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'eclinician.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Session) : null;
      return parsed?.user?.role ? parsed : null; // ignore stale/old-shape data
    } catch {
      return null;
    }
  });

  // Demo login: caller passes a full Session (see demoUsers.ts).
  // TODO (backend): replace callers with POST /api/auth/login and set the
  // returned Session (+ token) here. The rest of the app already reads Session,
  // so nothing downstream needs to change when we wire the real API.
  function login(next: Session) {
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function logout() {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
