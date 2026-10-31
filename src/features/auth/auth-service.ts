import { authApiClient } from '@/lib/api-client';
import { clearAuthSession, createOAuthSession, getAuthSession, saveAuthSession, type AuthSession, type AuthUser } from '@/lib/auth-session';
import { emailService } from '@/services/email-service';

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
  const { data } = await authApiClient.post<unknown>(path, { email: email.trim(), password });
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
  return saveSessionWithUserId(session);
}

async function saveSessionWithUserId(session: AuthSession): Promise<AuthSession> {
  saveAuthSession(session);
  try {
    if (!session.user.email) throw new Error('The signed-in account does not have an email address.');
    const userId = await emailService.getUserIdByEmail(session.user.email);
    const sessionWithUserId = { ...session, userId };
    saveAuthSession(sessionWithUserId);
    return sessionWithUserId;
  } catch (error) {
    clearAuthSession();
    throw error;
  }
}

export const authService: AuthService = {
  login: (email, password) => authenticate('/auth/login', email, password),
  register: (email, password) => authenticate('/auth/register', email, password),
  logout: clearAuthSession,
  getSession: getAuthSession,
};

export async function completeOAuthLogin(token: string, tokenType: string): Promise<AuthUser> {
  const session = createOAuthSession(token, tokenType);
  return (await saveSessionWithUserId(session)).user;
}
