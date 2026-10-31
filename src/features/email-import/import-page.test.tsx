import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAuthSession } from '@/lib/auth-session';
import { emailService } from '@/services/email-service';
import { renderWithProviders } from '@/test/utils';
import { ImportPage } from './import-page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));
beforeEach(() => {
  vi.restoreAllMocks();
  saveAuthSession({
    user: { name: 'Ada', email: 'ada@example.com' },
    token: 'jwt-token',
    tokenType: 'Bearer',
    userId: '1',
  });
  vi.spyOn(emailService, 'getHeaders').mockResolvedValue(['firstName', 'email']);
  vi.spyOn(emailService, 'getTransaction').mockResolvedValue({ tid: '3', status: 'PROCESSING', statusCode: null, message: null, isTerminal: false, isFailure: false, raw: {} });
});

describe('ImportPage', () => {
  it('lists server headers', async () => { renderWithProviders(<ImportPage />); expect(await screen.findByText('firstName')).toBeInTheDocument(); });
  it('rejects unsupported files', async () => {
    renderWithProviders(<ImportPage />);
    await userEvent.upload(screen.getByLabelText('Excel file'), new File(['x'], 'data.csv'), { applyAccept: false });
    expect(await screen.findByText(/only \.xlsx or \.xls/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload and import/i })).toBeDisabled();
  });
  it('shows file details, uploads, and surfaces the transaction', async () => {
    const imp = vi.spyOn(emailService, 'importExcel').mockResolvedValue({ tid: '3', raw: {} });
    renderWithProviders(<ImportPage />);
    await userEvent.upload(screen.getByLabelText('Excel file'), new File(['hello'], 'people.xlsx'));
    expect(screen.getByText('people.xlsx')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /upload and import/i }));
    expect(await screen.findByText('Import status')).toBeInTheDocument();
    expect(imp).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('people.xlsx')).not.toBeInTheDocument());
  });
  it('shows the server error and keeps the file when upload fails', async () => {
    vi.spyOn(emailService, 'importExcel').mockRejectedValue(new Error('Server exploded'));
    renderWithProviders(<ImportPage />);
    await userEvent.upload(screen.getByLabelText('Excel file'), new File(['hello'], 'people.xlsx'));
    await userEvent.click(screen.getByRole('button', { name: /upload and import/i }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByText('people.xlsx')).toBeInTheDocument();
  });
});
