import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { revokeSession } from '../api/auth';
import { endSession, renewSession, whenSessionExpires } from '../api/http';
import { clearTokens, getToken, saveTokens, type Tokens } from '../api/session';

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
  profileImage?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  primaryColor: string;
  secondaryLogoUrl?: string;
  enabledModules: ModuleKey[];
  active?: boolean;
}

export interface Session {
  user: User;
  isPlatformAdmin: boolean;
  tenant: Tenant | null;
}

interface AuthContextValue {
  session: Session | null;
  login: (session: Session, tokens: Tokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  /** Trades the refresh token for more time. False means the session is over. */
  renew: () => Promise<boolean>;
  /** Set when the session ended by itself, so the login page can say why. */
  expiredNotice: boolean;
  dismissNotice: () => void;
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
  const [expiredNotice, setExpiredNotice] = useState(false);

  // The API layer discovers an expiry first — it is the one holding the 401. This is
  // how that reaches the UI without every screen having to listen for it.
  useEffect(() => {
    whenSessionExpires(() => {
      setSession(null);
      setExpiredNotice(true);
      localStorage.removeItem(STORAGE_KEY);
    });
  }, []);

  // The session is what the UI renders; the tokens are what the API trusts. Login.tsx
  // builds both from POST /api/auth/login.
  function login(next: Session, tokens: Tokens) {
    saveTokens(tokens);
    setSession(next);
    setExpiredNotice(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  /** Deliberate sign-out: no notice, because the user knows why they are here. */
  function logout() {
    void revokeSession();
    clearTokens();
    setSession(null);
    setExpiredNotice(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateUser(user: Partial<User>) {
    setSession(current => {
      if (!current) return current;
      const next = { ...current, user: { ...current.user, ...user } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function renew() {
    if (await renewSession()) return true;
    endSession();
    return false;
  }

  return (
    <AuthContext.Provider value={{
      session, login, logout, updateUser, renew,
      expiredNotice, dismissNotice: () => setExpiredNotice(false),
    }}>
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
