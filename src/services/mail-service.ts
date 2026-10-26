import { apiClient } from '@/lib/api-client';
import { normalizeHealth, normalizeSimple } from './normalizers';

export const MAIL_ENDPOINTS = {
  health: '/api/mail/health',
  resumeUpload: '/api/mail/resume/upload',
  resumeDrive: '/api/mail/resume/drive-link',
  send: '/api/mail/send',
  coldTrigger: '/api/mail/cold-email/trigger',
} as const;

export const mailService = {
  async health(signal?: AbortSignal) {
    const { data } = await apiClient.get(MAIL_ENDPOINTS.health, { signal, timeout: 8000 });
    return normalizeHealth(data);
  },
  async uploadResume(file: File, onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post(MAIL_ENDPOINTS.resumeUpload, form, {
      onUploadProgress: (e) => { if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100)); },
    });
    return normalizeSimple(data);
  },
  async addResumeFromDrive(payload: { driveLink: string; fileName: string }) {
    const { data } = await apiClient.post(MAIL_ENDPOINTS.resumeDrive, payload);
    return normalizeSimple(data);
  },
  /** Sends a REAL email with the configured resume attached. */
  async send(payload: { to: string; subject: string; message: string }) {
    const { data } = await apiClient.post(MAIL_ENDPOINTS.send, payload);
    return normalizeSimple(data);
  },
  /** Triggers the cold-email batch immediately; may send REAL emails. */
  async triggerColdEmail() {
    const { data } = await apiClient.post(MAIL_ENDPOINTS.coldTrigger);
    return normalizeSimple(data);
  },
};
