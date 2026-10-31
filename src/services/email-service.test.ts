import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, userLookupApiClient } from '@/lib/api-client';
import { getAuthSession, saveAuthSession } from '@/lib/auth-session';
import { emailService } from './email-service';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  saveAuthSession({
    user: { name: 'Ada', email: 'ada@example.com' },
    token: 'jwt-token',
    tokenType: 'Bearer',
    userId: '1',
  });
});

describe('emailService', () => {
  it('clamps list paging params', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await emailService.list(-3, 500);
    expect(get).toHaveBeenCalledWith('/api/emails/list', expect.objectContaining({ params: { page: 0, size: 100 } }));
  });
  it('posts a JSON array to /api/emails/add and returns the tid', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { tid: 7 } });
    const res = await emailService.addEmails([{ email: 'a@b.co' }]);
    expect(post.mock.calls[0][0]).toBe('/api/emails/add');
    expect(post.mock.calls[0][1]).toEqual([{ email: 'a@b.co' }]);
    expect(res.tid).toBe('7');
    expect(getAuthSession()?.transactionOperations).toEqual({ '7': 'single-email' });
  });
  it('records multiple-email submissions separately from single-email submissions', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { tid: 8 } });
    await emailService.addEmails([{ email: 'a@b.co' }, { email: 'c@d.co' }]);
    expect(getAuthSession()?.transactionOperations).toEqual({ '8': 'multiple-emails' });
  });
  it('uploads multipart with field "file" and no manual Content-Type', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { tid: 1 } });
    const file = new File(['x'], 'a.xlsx');
    await emailService.importExcel(file);
    const [url, body, config] = post.mock.calls[0] as [string, FormData, { headers?: Record<string, string> }];
    expect(url).toBe('/api/emails/import-excel');
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('a.xlsx');
    expect(config.headers?.['Content-Type']).toBeUndefined();
    expect(getAuthSession()?.transactionOperations).toEqual({ '1': 'excel-import' });
  });
  it('queries enquiry by tid', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { status: 'DONE' } });
    const tx = await emailService.getTransaction('9');
    expect(get).toHaveBeenCalledWith('/api/emails/enquiry', expect.objectContaining({ params: { tid: '9' } }));
    expect(tx.isTerminal).toBe(true);
  });
  it('looks up a user ID by email without an internal API key', async () => {
    const post = vi.spyOn(userLookupApiClient, 'post').mockResolvedValue({ data: { userId: 1, email: 'ada@example.com' } });
    await expect(emailService.getUserIdByEmail('ada@example.com')).resolves.toBe('1');
    expect(post).toHaveBeenCalledWith('/api/v1/internal/users/by-email', { email: 'ada@example.com' }, expect.objectContaining({ signal: undefined }));
  });
  it('loads a user transaction page with the expected query parameters', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        transactions: [{ tid: 149, txnStatus: 'SUCCESS', statusCode: 200 }],
        currentPage: 0,
        pageSize: 5,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    });
    const page = await emailService.listTransactions('1', 0, 5);
    expect(get).toHaveBeenCalledWith('/api/emails/transactions', expect.objectContaining({
      params: { user_id: '1', page: 0, size: 5 },
    }));
    expect(page.items[0].tid).toBe('149');
    expect(page.hasNext).toBe(false);
  });
});
