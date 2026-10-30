export interface AuthUser { name: string; email: string }
export interface AuthSession { user: AuthUser; token: string; tokenType: string }

const SESSION_KEY = 'maildesk.auth.session';
export const AUTH_SESSION_EXPIRED_EVENT = 'maildesk:session-expired';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      isRecord(value) && typeof value.token === 'string' && value.token &&
      typeof value.tokenType === 'string' && value.tokenType &&
      isRecord(value.user) && typeof value.user.email === 'string' &&
      typeof value.user.name === 'string'
    ) {
      return {
        token: value.token,
        tokenType: value.tokenType,
        user: { email: value.user.email, name: value.user.name },
      };
    }
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function createOAuthSession(token: string, tokenType: string): AuthSession {
  const claims = token.split('.')[1];
  let email = '';
  if (claims) {
    try {
      const normalizedClaims = claims.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedClaims.padEnd(Math.ceil(normalizedClaims.length / 4) * 4, '='))) as unknown;
      if (isRecord(payload)) {
        if (typeof payload.email === 'string') {
          email = payload.email;
        } else if (typeof payload.sub === 'string' && payload.sub.includes('@')) {
          email = payload.sub;
        } else if (typeof payload.preferred_username === 'string' && payload.preferred_username.includes('@')) {
          email = payload.preferred_username;
        }
      }
    } catch {
      // The API validates the token; claims here are only used to populate the profile display.
    }
  }
  const localPart = email.split('@')[0] || 'Google user';
  const name = localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  return { token, tokenType, user: { email, name } };
}
