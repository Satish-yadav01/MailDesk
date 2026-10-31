import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from './api-client';
import { clearAuthSession, saveAuthSession } from './auth-session';

beforeEach(() => {
  clearAuthSession();
});

describe('apiClient authentication', () => {
  it('adds the stored bearer token to API requests', async () => {
    saveAuthSession({
      user: { name: 'Ada', email: 'ada@example.com' },
      token: 'jwt-token',
      tokenType: 'Bearer',
      userId: '42',
    });
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      requestConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await apiClient.get('/protected', { params: { page: 0 }, adapter });

    expect(requestConfig?.headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(requestConfig?.params).toEqual({ page: 0, user_id: '42' });
  });

  it('does not send Mail Service requests when the session has no user ID', async () => {
    saveAuthSession({
      user: { name: 'Ada', email: 'ada@example.com' },
      token: 'jwt-token',
      tokenType: 'Bearer',
    });

    await expect(apiClient.get('/protected')).rejects.toThrow(
      'Your account ID is not available. Please sign in again or retry loading your account details.',
    );
  });
});
