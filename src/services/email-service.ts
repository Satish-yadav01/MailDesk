import { apiClient, userLookupApiClient } from '@/lib/api-client';
import { saveTransactionOperation } from '@/lib/auth-session';
import type { EmailRecordInput, TransactionPage, TransactionStatus } from '@/types/api';
import { normalizeEmailPage, normalizeHeaders, normalizeSubmission, normalizeTransaction, normalizeTransactionPage } from './normalizers';

/** Service API endpoint paths. */
export const EMAIL_ENDPOINTS = {
  headers: '/api/email-info/emailListHeaders',
  add: '/api/emails/add',
  importExcel: '/api/emails/import-excel',
  enquiry: '/api/emails/enquiry',
  transactions: '/api/emails/transactions',
  userByEmail: '/api/v1/internal/users/by-email',
  list: '/api/emails/list',
} as const;

export const MAX_PAGE_SIZE = 100;

export const emailService = {
  async getHeaders(signal?: AbortSignal) {
    const { data } = await apiClient.get(EMAIL_ENDPOINTS.headers, { signal });
    return normalizeHeaders(data);
  },

  async list(page: number, size: number, signal?: AbortSignal) {
    const safeSize = Math.min(Math.max(1, Math.floor(size)), MAX_PAGE_SIZE);
    const safePage = Math.max(0, Math.floor(page));
    const { data } = await apiClient.get(EMAIL_ENDPOINTS.list, { params: { page: safePage, size: safeSize }, signal });
    return normalizeEmailPage(data, safePage, safeSize);
  },

  /** Body is a JSON array of records. Expected 202 with { tid }. */
  async addEmails(records: EmailRecordInput[]) {
    const { data } = await apiClient.post(EMAIL_ENDPOINTS.add, records, { headers: { 'Content-Type': 'application/json' } });
    const submission = normalizeSubmission(data);
    saveTransactionOperation(submission.tid, records.length === 1 ? 'single-email' : 'multiple-emails');
    return submission;
  },

  /** multipart/form-data, field "file". Content-Type is intentionally not set so the browser adds the boundary. */
  async importExcel(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post(EMAIL_ENDPOINTS.importExcel, form, {
      signal,
      timeout: 0, // large files: rely on the server, not the default timeout
      onUploadProgress: (e) => { if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100)); },
    });
    const submission = normalizeSubmission(data);
    saveTransactionOperation(submission.tid, 'excel-import');
    return submission;
  },

  async getTransaction(tid: string, signal?: AbortSignal): Promise<TransactionStatus> {
    const { data } = await apiClient.get(EMAIL_ENDPOINTS.enquiry, { params: { tid }, signal });
    return normalizeTransaction(data, tid);
  },

  async getUserIdByEmail(email: string, signal?: AbortSignal): Promise<string> {
    const { data } = await userLookupApiClient.post<unknown>(EMAIL_ENDPOINTS.userByEmail, { email }, { signal });
    const userId = typeof data === 'object' && data !== null && 'userId' in data ? str(data.userId) : null;
    if (!userId) throw new Error('The user service did not return a user ID for this email.');
    return userId;
  },

  async listTransactions(userId: string, page: number, size: number, signal?: AbortSignal): Promise<TransactionPage> {
    const safeSize = Math.min(Math.max(1, Math.floor(size)), MAX_PAGE_SIZE);
    const safePage = Math.max(0, Math.floor(page));
    const { data } = await apiClient.get(EMAIL_ENDPOINTS.transactions, {
      params: { user_id: userId, page: safePage, size: safeSize },
      signal,
    });
    return normalizeTransactionPage(data, safePage, safeSize);
  },
};

function str(value: unknown): string | null {
  return value === null || value === undefined || value === '' || typeof value === 'object' ? null : String(value);
}
