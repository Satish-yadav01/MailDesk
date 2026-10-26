import { apiClient } from '@/lib/api-client';
import type { EmailRecordInput, TransactionStatus } from '@/types/api';
import { normalizeEmailPage, normalizeHeaders, normalizeSubmission, normalizeTransaction } from './normalizers';

/** Endpoint paths come straight from the Postman collection. */
export const EMAIL_ENDPOINTS = {
  headers: '/api/email-info/emailListHeaders',
  add: '/api/emails/add',
  importExcel: '/api/emails/import-excel',
  enquiry: '/api/emails/enquiry',
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
    return normalizeSubmission(data);
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
    return normalizeSubmission(data);
  },

  async getTransaction(tid: string, signal?: AbortSignal): Promise<TransactionStatus> {
    const { data } = await apiClient.get(EMAIL_ENDPOINTS.enquiry, { params: { tid }, signal });
    return normalizeTransaction(data, tid);
  },
};
