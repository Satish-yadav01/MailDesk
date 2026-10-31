export interface AuthUser { name: string; email: string }
export type TransactionOperation = 'single-email' | 'multiple-emails' | 'excel-import';
export interface AuthSession {
  user: AuthUser;
  token: string;
  tokenType: string;
  userId?: string;
  transactionOperations?: Record<string, TransactionOperation>;
}

const SESSION_KEY = 'maildesk.auth.session';
export const AUTH_SESSION_EXPIRED_EVENT = 'maildesk:session-expired';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTransactionOperation(value: unknown): value is TransactionOperation {
  return value === 'single-email' || value === 'multiple-emails' || value === 'excel-import';
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
      const transactionOperations = isRecord(value.transactionOperations)
        ? Object.fromEntries(
          Object.entries(value.transactionOperations)
            .filter((entry): entry is [string, TransactionOperation] => isTransactionOperation(entry[1]))
            .slice(-200),
        )
        : undefined;
      return {
        token: value.token,
        tokenType: value.tokenType,
        user: { email: value.user.email, name: value.user.name },
        ...(typeof value.userId === 'string' && value.userId ? { userId: value.userId } : {}),
        ...(transactionOperations && Object.keys(transactionOperations).length ? { transactionOperations } : {}),
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

export function saveTransactionOperation(tid: string, operation: TransactionOperation): void {
  const session = getAuthSession();
  if (!session) return;
  const transactionOperations = { ...session.transactionOperations, [tid]: operation };
  const recentOperations = Object.fromEntries(Object.entries(transactionOperations).slice(-200));
  saveAuthSession({ ...session, transactionOperations: recentOperations });
}

export function getTransactionOperation(tid: string): TransactionOperation | null {
  return getAuthSession()?.transactionOperations?.[tid] ?? null;
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
