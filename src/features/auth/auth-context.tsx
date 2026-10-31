import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT, getAuthSession, saveAuthSession, type AuthSession } from '@/lib/auth-session';
import { emailService } from '@/services/email-service';
import { authService, completeOAuthLogin, type AuthService, type AuthUser } from './auth-service';

interface AuthContextValue {
  user: AuthUser | null;
  userId: string | null;
  userIdError: unknown | null;
  retryUserIdLookup: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  completeOAuth: (token: string, tokenType: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service = authService }: { children: ReactNode; service?: AuthService }) {
  const [session, setSession] = useState(() => service.getSession());
  const [userIdError, setUserIdError] = useState<unknown | null>(null);
  useEffect(() => {
    const expireSession = () => {
      setSession(null);
      setUserIdError(null);
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
  }, []);
  const resolveUserId = useCallback(async (currentSession: AuthSession | null = session) => {
    if (!currentSession || currentSession.userId) return;
    setUserIdError(null);
    try {
      const userId = await emailService.getUserIdByEmail(currentSession.user.email);
      const latestSession = getAuthSession();
      if (!latestSession || latestSession.token !== currentSession.token) return;
      const updatedSession = { ...latestSession, userId };
      saveAuthSession(updatedSession);
      setSession(updatedSession);
    } catch (error) {
      if (getAuthSession()?.token === currentSession.token) setUserIdError(error);
    }
  }, [session]);
  useEffect(() => {
    if (session && !session.userId) void resolveUserId(session);
  }, [session, resolveUserId]);
  const login = useCallback(async (e: string, p: string) => {
    setUserIdError(null);
    setSession(await service.login(e, p));
  }, [service]);
  const register = useCallback(async (e: string, p: string) => {
    setUserIdError(null);
    setSession(await service.register(e, p));
  }, [service]);
  const completeOAuth = useCallback(async (token: string, tokenType: string) => {
    await completeOAuthLogin(token, tokenType);
    setUserIdError(null);
    setSession(service.getSession());
  }, [service]);
  const logout = useCallback(async () => {
    await service.logout();
    setUserIdError(null);
    setSession(null);
  }, [service]);
  const value = useMemo(() => ({
    user: session?.user ?? null,
    userId: session?.userId ?? null,
    userIdError,
    retryUserIdLookup: () => resolveUserId(),
    login,
    register,
    completeOAuth,
    logout,
  }), [session, userIdError, resolveUserId, login, register, completeOAuth, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
