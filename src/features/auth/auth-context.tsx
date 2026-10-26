import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth-session';
import { authService, completeOAuthLogin, type AuthService, type AuthUser } from './auth-service';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  completeOAuth: (token: string, tokenType: string) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service = authService }: { children: ReactNode; service?: AuthService }) {
  const [user, setUser] = useState<AuthUser | null>(() => service.getSession()?.user ?? null);
  useEffect(() => {
    const expireSession = () => setUser(null);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
  }, []);
  const login = useCallback(async (e: string, p: string) => setUser((await service.login(e, p)).user), [service]);
  const register = useCallback(async (e: string, p: string) => setUser((await service.register(e, p)).user), [service]);
  const completeOAuth = useCallback((token: string, tokenType: string) => setUser(completeOAuthLogin(token, tokenType)), []);
  const logout = useCallback(async () => { await service.logout(); setUser(null); }, [service]);
  const value = useMemo(() => ({ user, login, register, completeOAuth, logout }), [user, login, register, completeOAuth, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
