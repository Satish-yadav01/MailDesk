import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { emailService } from './email-service';

beforeEach(() => vi.restoreAllMocks());

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
  });
  it('queries enquiry by tid', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { status: 'DONE' } });
    const tx = await emailService.getTransaction('9');
    expect(get).toHaveBeenCalledWith('/api/emails/enquiry', expect.objectContaining({ params: { tid: '9' } }));
    expect(tx.isTerminal).toBe(true);
  });
});
