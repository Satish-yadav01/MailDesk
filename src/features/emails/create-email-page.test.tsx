import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailService } from '@/services/email-service';
import { renderWithProviders } from '@/test/utils';
import { CreateEmailPage } from './create-email-page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));
beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(emailService, 'getTransaction').mockResolvedValue({ tid: '42', status: 'PROCESSING', statusCode: null, message: null, isTerminal: false, isFailure: false, raw: {} }); });

describe('CreateEmailPage', () => {
  it('blocks submission and shows an error for an invalid email', async () => {
    const add = vi.spyOn(emailService, 'addEmails');
    renderWithProviders(<CreateEmailPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /create record/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });
  it('sends a one-element array, then shows status and resets the form on success', async () => {
    const add = vi.spyOn(emailService, 'addEmails').mockResolvedValue({ tid: '42', raw: {} });
    renderWithProviders(<CreateEmailPage />);
    expect(screen.queryByLabelText(/email status/i)).not.toBeInTheDocument();
    const input = screen.getByLabelText(/email address/i);
    await userEvent.type(input, 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create record/i }));
    expect(await screen.findByText('Submission status')).toBeInTheDocument();
    expect(add.mock.calls[0][0]).toEqual([{ email: 'ada@example.com', emailStatus: 'UNVERIFIED' }]);
    await waitFor(() => expect(input).toHaveValue(''));
  });
  it('keeps values and shows server field errors on failure', async () => {
    const err = new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, { status: 400, data: { message: 'Rejected', errors: { email: 'Already exists' } }, statusText: '', headers: {}, config: {} as never });
    vi.spyOn(emailService, 'addEmails').mockRejectedValue(err);
    renderWithProviders(<CreateEmailPage />);
    const input = screen.getByLabelText(/email address/i);
    await userEvent.type(input, 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create record/i }));
    expect(await screen.findByText('Already exists')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(input).toHaveValue('ada@example.com');
    expect(screen.queryByText('Submission status')).not.toBeInTheDocument();
  });
});
