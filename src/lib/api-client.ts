import axios from 'axios';
import { AUTH_SESSION_EXPIRED_EVENT, clearAuthSession, getAuthSession } from './auth-session';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'https://maildesk-service.onrender.com').replace(/\/+$/, '');
const authBaseURL = (import.meta.env.VITE_AUTH_API_BASE_URL ?? 'https://user-service-9ilv.onrender.com').replace(/\/+$/, '');
const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30_000;

/**
 * Axios clients for the Mail Service and User Service.
 * - Adds the signed-in user's token to protected API requests.
 * - Nothing is logged: request/response bodies contain personal email data.
 */
function createApiClient(serviceBaseURL: string) {
  const client = axios.create({
    baseURL: serviceBaseURL,
    timeout,
    headers: { Accept: 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const session = getAuthSession();
    if (session) config.headers.set('Authorization', `${session.tokenType} ${session.token}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuthSession();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
      }
      return Promise.reject(error);
    },
  );
  return client;
}

export const apiClient = createApiClient(baseURL);
export const authApiClient = createApiClient(authBaseURL);
export const API_BASE_URL = baseURL;
export const AUTH_API_BASE_URL = authBaseURL;
