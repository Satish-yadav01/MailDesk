import { apiClient } from '@/lib/api-client';
import { clearAuthSession, createOAuthSession, getAuthSession, saveAuthSession, type AuthSession, type AuthUser } from '@/lib/auth-session';

export type { AuthSession, AuthUser } from '@/lib/auth-session';

export interface AuthService {
  login(email: string, password: string): Promise<AuthSession>;
  register(email: string, password: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
}

function userFromEmail(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split('@')[0] ?? 'User';
  return {
    email: normalizedEmail,
    name: localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  };
}

async function authenticate(path: '/auth/login' | '/auth/register', email: string, password: string): Promise<AuthSession> {
  const { data } = await apiClient.post<unknown>(path, { email: email.trim(), password });
  if (
    typeof data !== 'object' || data === null ||
    !('token' in data) || typeof data.token !== 'string' || !data.token ||
    !('tokenType' in data) || typeof data.tokenType !== 'string' || !data.tokenType
  ) {
    throw new Error('The authentication service returned an invalid token response.');
  }

  const session: AuthSession = {
    user: userFromEmail(email),
    token: data.token,
    tokenType: data.tokenType,
  };
  saveAuthSession(session);
  return session;
}

export const authService: AuthService = {
  login: (email, password) => authenticate('/auth/login', email, password),
  register: (email, password) => authenticate('/auth/register', email, password),
  logout: clearAuthSession,
  getSession: getAuthSession,
};

export function completeOAuthLogin(token: string, tokenType: string): AuthUser {
  const session = createOAuthSession(token, tokenType);
  saveAuthSession(session);
  return session.user;
}
