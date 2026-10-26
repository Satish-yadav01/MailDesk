import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailService } from '@/services/email-service';
import { normalizeEmailPage } from '@/services/normalizers';
import { renderWithProviders } from '@/test/utils';
import { EmailListPage } from './email-list-page';

beforeEach(() => vi.restoreAllMocks());

describe('EmailListPage', () => {
  it('shows a loading state, then rows (null fields safe)', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage({ content: [{ email: 'a@b.co', firstName: null }, { email: 'c@d.co' }], totalElements: 2 }, 0, 10));
    renderWithProviders(<EmailListPage />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect((await screen.findAllByText('a@b.co')).length).toBeGreaterThan(0);
  });
  it('shows an empty state', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([], 0, 10));
    renderWithProviders(<EmailListPage />);
    expect(await screen.findByText('No email records yet')).toBeInTheDocument();
  });
  it('shows an error with retry', async () => {
    const list = vi.spyOn(emailService, 'list').mockRejectedValueOnce(new Error('boom')).mockResolvedValue(normalizeEmailPage([{ email: 'x@y.co' }], 0, 10));
    renderWithProviders(<EmailListPage />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect((await screen.findAllByText('x@y.co')).length).toBeGreaterThan(0);
    expect(list).toHaveBeenCalledTimes(2);
  });
  it('filters the loaded page client-side', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([{ email: 'ada@x.co' }, { email: 'bob@y.co' }], 0, 10));
    renderWithProviders(<EmailListPage />);
    await screen.findAllByText('ada@x.co');
    await userEvent.type(screen.getByLabelText(/search records/i), 'bob');
    expect(screen.queryAllByText('ada@x.co')).toHaveLength(0);
    expect(screen.getAllByText('bob@y.co').length).toBeGreaterThan(0);
  });
});
