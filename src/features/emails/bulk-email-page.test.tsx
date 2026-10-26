import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailService } from '@/services/email-service';
import { renderWithProviders } from '@/test/utils';
import { BulkEmailPage } from './bulk-email-page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

beforeEach(() => { vi.restoreAllMocks(); });

describe('BulkEmailPage', () => {
  it('hides email status and submits every record as UNVERIFIED', async () => {
    const add = vi.spyOn(emailService, 'addEmails').mockResolvedValue({ tid: '42', raw: {} });
    renderWithProviders(<BulkEmailPage />);

    expect(screen.queryByLabelText(/email status/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/email address/i), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /review 1 record/i }));
    expect(await screen.findByText('UNVERIFIED')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /submit 1 record/i }));

    expect(add).toHaveBeenCalledWith([{ email: 'ada@example.com', emailStatus: 'UNVERIFIED' }]);
  });
});
