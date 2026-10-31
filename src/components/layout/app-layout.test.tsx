import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { saveAuthSession } from '@/lib/auth-session';
import { renderWithProviders } from '@/test/utils';
import { AppLayout } from './app-layout';

beforeEach(() => {
  localStorage.clear();
  saveAuthSession({
    user: { name: 'Ada Lovelace', email: 'ada@example.com' },
    token: 'jwt-token',
    tokenType: 'Bearer',
    userId: '42',
  });
});

describe('AppLayout profile menu', () => {
  it('shows the signed-in user ID in the profile popover', async () => {
    renderWithProviders(<AppLayout />);
    await userEvent.click(screen.getByRole('button', { name: 'Profile menu' }));

    expect(screen.getByText('User ID:')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('omits the user ID until one is available', async () => {
    saveAuthSession({
      user: { name: 'Ada Lovelace', email: 'ada@example.com' },
      token: 'jwt-token',
      tokenType: 'Bearer',
    });
    renderWithProviders(<AppLayout />);
    await userEvent.click(screen.getByRole('button', { name: 'Profile menu' }));

    expect(screen.queryByText(/User ID:/)).not.toBeInTheDocument();
  });
});
