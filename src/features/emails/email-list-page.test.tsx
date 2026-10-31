import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAuthSession } from '@/lib/auth-session';
import { emailService } from '@/services/email-service';
import { normalizeEmailPage } from '@/services/normalizers';
import { renderWithProviders } from '@/test/utils';
import { EmailListPage } from './email-list-page';

beforeEach(() => {
  vi.restoreAllMocks();
  saveAuthSession({
    user: { name: 'Ada', email: 'ada@example.com' },
    token: 'jwt-token',
    tokenType: 'Bearer',
    userId: '1',
  });
});

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
    expect(screen.queryByRole('row', { name: /ada@x\.co/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /bob@y\.co/ })).toBeInTheDocument();
  });

  it('combines column filters for company and status', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([
      { email: 'ada@x.co', firstName: 'Ada', emailStatus: 'VERIFIED', companyName: 'NPST' },
      { email: 'bob@y.co', firstName: 'Bob', emailStatus: 'UNVERIFIED', companyName: 'Acme' },
      { email: 'cat@z.co', firstName: 'Cat', emailStatus: 'VERIFIED', companyName: 'Acme' },
    ], 0, 10));
    renderWithProviders(<EmailListPage />);
    await screen.findByRole('row', { name: /ada@x\.co/ });

    await userEvent.click(screen.getByRole('button', { name: 'Filter by Company' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Company filter' }), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: 'Filter by Status' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'VERIFIED');

    expect(screen.getByRole('row', { name: /cat@z\.co/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /ada@x\.co/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /bob@y\.co/ })).not.toBeInTheDocument();
  });

  it('can filter records with a missing column value and clear all filters', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([
      { email: 'ada@x.co', companyName: 'NPST' },
      { email: 'bob@y.co', companyName: null },
    ], 0, 10));
    renderWithProviders(<EmailListPage />);
    await screen.findByRole('row', { name: /ada@x\.co/ });

    await userEvent.click(screen.getByRole('button', { name: 'Filter by Company' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Company filter' }), '__empty__');
    expect(screen.getByRole('row', { name: /bob@y\.co/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /ada@x\.co/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(screen.getByRole('row', { name: /ada@x\.co/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /bob@y\.co/ })).toBeInTheDocument();
  });

  it('closes the column filter when clicking outside it', async () => {
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([{ email: 'ada@x.co', companyName: 'NPST' }], 0, 10));
    renderWithProviders(<EmailListPage />);
    await screen.findByRole('row', { name: /ada@x\.co/ });

    await userEvent.click(screen.getByRole('button', { name: 'Filter by Company' }));
    const filterSelect = screen.getByRole('combobox', { name: 'Company filter' });
    expect(filterSelect).toBeInTheDocument();
    const popup = filterSelect.parentElement;
    expect(popup?.parentElement).toBe(document.body);
    expect(popup).toHaveStyle({ position: 'fixed' });
    expect(popup).toHaveClass('min-h-[148px]');

    await userEvent.click(screen.getByRole('textbox', { name: 'Search records on this page' }));
    expect(screen.queryByRole('combobox', { name: 'Company filter' })).not.toBeInTheDocument();
  });

  it('exports only the rows matching the active filters', async () => {
    const NativeURL = URL;
    const createObjectURL = vi.fn().mockReturnValue('blob:email-export');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', class extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(emailService, 'list').mockResolvedValue(normalizeEmailPage([
      { email: 'ada@x.co', companyName: 'NPST' },
      { email: 'bob@y.co', companyName: 'Acme' },
    ], 0, 10));
    renderWithProviders(<EmailListPage />);
    await screen.findByRole('row', { name: /ada@x\.co/ });

    await userEvent.click(screen.getByRole('button', { name: 'Filter by Company' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Company filter' }), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain('"Email","Name","Status","Company","Title","Location","Created"');
    expect(csv).toContain('"bob@y.co"');
    expect(csv).not.toContain('"ada@x.co"');
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });
});
