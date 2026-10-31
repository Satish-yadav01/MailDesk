import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApiClient, userLookupApiClient } from '@/lib/api-client';
import { renderWithProviders } from '@/test/utils';
import { AuthCallbackPage } from './auth-callback-page';
import { LoginPage, RegisterPage } from './auth-pages';
import { ProtectedRoute } from './protected-route';

const tree = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route element={<ProtectedRoute />}><Route path="/app" element={<h1>Dashboard secret</h1>} /></Route>
  </Routes>
);

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('API authentication', () => {
  it('redirects unauthenticated users to login', () => {
    renderWithProviders(tree, { route: '/app' });
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard secret')).not.toBeInTheDocument();
  });
  it('shows validation errors for empty and malformed input', async () => {
    renderWithProviders(tree, { route: '/login' });
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/email/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });
  it('logs in through the API and stores the returned token without storing the password', async () => {
    const post = vi.spyOn(authApiClient, 'post').mockResolvedValue({ data: { token: 'jwt-token', tokenType: 'Bearer' } });
    const lookup = vi.spyOn(userLookupApiClient, 'post').mockResolvedValue({ data: { userId: 7 } });
    renderWithProviders(tree, { route: '/login' });
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Dashboard secret')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'ada@example.com', password: 'secret-password' });
    expect(lookup).toHaveBeenCalledTimes(1);
    const stored = Object.values(localStorage).join('');
    expect(stored).toContain('ada@example.com');
    expect(stored).toContain('jwt-token');
    expect(stored).toContain('"userId":"7"');
    expect(stored).not.toContain('secret-password');
  });
  it('registers using the API email/password contract', async () => {
    const post = vi.spyOn(authApiClient, 'post').mockResolvedValue({ data: { token: 'new-token', tokenType: 'Bearer' } });
    const lookup = vi.spyOn(userLookupApiClient, 'post').mockResolvedValue({ data: { userId: 8 } });
    renderWithProviders(tree, { route: '/register' });
    await userEvent.type(screen.getByLabelText(/work email/i), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret6');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret6');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Dashboard secret')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/register', { email: 'ada@example.com', password: 'secret6' });
    expect(lookup).toHaveBeenCalledTimes(1);
  });
  it('enforces matching registration passwords', async () => {
    const post = vi.spyOn(authApiClient, 'post');
    renderWithProviders(tree, { route: '/register' });
    await userEvent.type(screen.getByLabelText(/work email/i), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret6');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText('Passwords do not match')).toBeInTheDocument());
    expect(post).not.toHaveBeenCalled();
  });
  it('shows the configurable Google OAuth destination on auth pages', () => {
    renderWithProviders(tree, { route: '/login' });
    expect(screen.getByRole('link', { name: /continue with google/i })).toHaveAttribute(
      'href',
      'https://user-service-9ilv.onrender.com/oauth2/authorization/google',
    );
  });
  it('stores the OAuth token from the callback fragment and opens the protected app', async () => {
    vi.spyOn(userLookupApiClient, 'post').mockResolvedValue({ data: { userId: 9 } });
    const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZGFAZXhhbXBsZS5jb20ifQ.signature';
    window.history.replaceState({}, '', `/auth/callback#token=${token}&tokenType=Bearer`);
    renderWithProviders(tree, { route: '/auth/callback' });

    expect(await screen.findByText('Dashboard secret')).toBeInTheDocument();
    expect(Object.values(localStorage).join('')).toContain(token);
    expect(window.location.hash).toBe('');
  });
  it('defaults the Google callback auth scheme and reads the email claim from the JWT', async () => {
    vi.spyOn(userLookupApiClient, 'post').mockResolvedValue({ data: { userId: 10 } });
    const token = `header.${btoa(JSON.stringify({ email: 'ada@example.com' }))}.signature`;
    window.history.replaceState({}, '', `/auth/callback#token=${encodeURIComponent(token)}`);
    renderWithProviders(tree, { route: '/auth/callback' });

    expect(await screen.findByText('Dashboard secret')).toBeInTheDocument();
    const session = Object.values(localStorage).join('');
    expect(session).toContain('Bearer');
    expect(session).toContain('ada@example.com');
  });
  it('shows the account lookup error when OAuth session setup fails', async () => {
    vi.spyOn(userLookupApiClient, 'post').mockRejectedValue(new Error('Account lookup is not configured for this deployment.'));
    window.history.replaceState({}, '', '/auth/callback#token=header.eyJlbWFpbCI6ImFkYUBleGFtcGxlLmNvbSJ9.signature');
    renderWithProviders(tree, { route: '/auth/callback' });

    expect(await screen.findByText('Account lookup is not configured for this deployment.')).toBeInTheDocument();
  });
});
