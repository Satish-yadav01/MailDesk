import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { renderWithProviders } from '@/test/utils';
import { MailSenderPage } from './mail-sender-page';

beforeEach(() => vi.restoreAllMocks());

describe('MailSenderPage', () => {
  it('shows an under-construction dialog for each action without calling the backend', async () => {
    const get = vi.spyOn(apiClient, 'get');
    const post = vi.spyOn(apiClient, 'post');
    const user = userEvent.setup();
    renderWithProviders(<MailSenderPage />);

    for (const action of ['Upload resume', 'Add from Drive', 'Send email', 'Trigger cold-email batch']) {
      await user.click(screen.getByRole('button', { name: new RegExp(action, 'i') }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Under construction' })).toBeInTheDocument();
      expect(screen.getByText(/No request was sent/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Got it' }));
    }

    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
