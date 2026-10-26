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
    });
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      requestConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await apiClient.get('/protected', { adapter });

    expect(requestConfig?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });
});
