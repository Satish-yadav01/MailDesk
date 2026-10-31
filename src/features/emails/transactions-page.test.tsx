import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAuthSession } from '@/lib/auth-session';
import { emailService } from '@/services/email-service';
import { renderWithProviders } from '@/test/utils';
import { TransactionsPage } from './transactions-page';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  saveAuthSession({
    user: { email: 'ada@example.com', name: 'Ada' },
    token: 'jwt-token',
    tokenType: 'Bearer',
    userId: '1',
    transactionOperations: { '149': 'single-email' },
  });
});

describe('TransactionsPage', () => {
  it('searches and filters transactions loaded on the current page', async () => {
    vi.spyOn(emailService, 'listTransactions').mockResolvedValue({
      items: [
        {
          tid: '149',
          userId: '1',
          url: '/api/emails/add',
          status: 'SUCCESS',
          statusCode: 200,
          message: 'Processing completed successfully',
          isTerminal: true,
          isFailure: false,
          raw: {},
        },
        {
          tid: '148',
          userId: '1',
          url: '/api/emails/import-excel',
          status: 'FAILED',
          statusCode: 500,
          message: 'Import failed',
          isTerminal: true,
          isFailure: true,
          raw: {},
        },
      ],
      page: 0,
      size: 5,
      totalElements: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByRole('heading', { name: 'Transaction History' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /149/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /148/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Filter by Status' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'SUCCESS');
    expect(screen.getByRole('row', { name: /149/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /148/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Search transactions on this page' }), '149');
    expect(screen.getByRole('row', { name: /149/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /148/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(screen.getByRole('row', { name: /149/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /148/ })).toBeInTheDocument();
  });

  it('uses the stored user ID to list transactions and paginate without looking it up again', async () => {
    const lookup = vi.spyOn(emailService, 'getUserIdByEmail');
    const list = vi.spyOn(emailService, 'listTransactions')
      .mockResolvedValueOnce({
        items: [{
          tid: '149',
          userId: '1',
          url: '/api/emails/add',
          status: 'SUCCESS',
          statusCode: 200,
          message: 'Processing completed successfully',
          isTerminal: true,
          isFailure: false,
          raw: {},
        }],
        page: 0,
        size: 5,
        totalElements: 6,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 5,
        totalElements: 6,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      });

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByText('149')).toBeInTheDocument();
    expect(screen.getByText('/api/emails/add')).toBeInTheDocument();
    expect(screen.getByText('Add a single email')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.queryByLabelText(/transaction id/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check status/i })).not.toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledWith('1', 0, 5, expect.anything());

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(list).toHaveBeenCalledWith('1', 1, 5, expect.anything()));
    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
  });

  it('resolves and saves the ID once for an existing session without one', async () => {
    saveAuthSession({
      user: { email: 'ada@example.com', name: 'Ada' },
      token: 'jwt-token',
      tokenType: 'Bearer',
    });
    const lookup = vi.spyOn(emailService, 'getUserIdByEmail').mockResolvedValue('2');
    vi.spyOn(emailService, 'listTransactions').mockResolvedValue({
      items: [],
      page: 0,
      size: 5,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    });

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('maildesk.auth.session') ?? '{}').userId).toBe('2');
  });

  it('identifies Excel imports as an operation that creates multiple emails', async () => {
    const list = vi.spyOn(emailService, 'listTransactions').mockResolvedValue({
      items: [{
        tid: '150',
        userId: '1',
        url: '/api/emails/import-excel',
        status: 'SUCCESS',
        statusCode: 200,
        message: null,
        isTerminal: true,
        isFailure: false,
        raw: {},
      }],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByText('Upload Excel file (multiple emails)')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith('1', 0, 5, expect.anything());
  });
});
