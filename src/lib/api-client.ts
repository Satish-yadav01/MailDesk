import axios from 'axios';
import { AUTH_SESSION_EXPIRED_EVENT, clearAuthSession, getAuthSession } from './auth-session';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081').replace(/\/+$/, '');
const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30_000;

/**
 * Single Axios instance for the whole app.
 * - Adds the signed-in user's token to protected API requests.
 * - Nothing is logged: request/response bodies contain personal email data.
 */
export const apiClient = axios.create({
  baseURL,
  timeout,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const session = getAuthSession();
  if (session) config.headers.set('Authorization', `${session.tokenType} ${session.token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export const API_BASE_URL = baseURL;
