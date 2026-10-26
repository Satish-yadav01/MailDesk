import axios, { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  /** Field-level errors when the server returns them in a recognisable shape. */
  fieldErrors: Record<string, string>;
  isNetwork: boolean;
  isTimeout: boolean;
  isCanceled: boolean;
  details?: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function pickMessage(data: unknown): string | undefined {
  if (typeof data === 'string' && data.trim()) return data.trim().slice(0, 500);
  if (isRecord(data)) {
    for (const key of ['message', 'error', 'detail', 'title', 'errorMessage']) {
      const v = data[key];
      if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 500);
    }
  }
  return undefined;
}

function pickFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(data)) return out;
  const candidate = data.errors ?? data.fieldErrors ?? data.violations;
  if (isRecord(candidate)) {
    for (const [k, v] of Object.entries(candidate)) {
      if (typeof v === 'string') out[k] = v;
      else if (Array.isArray(v) && typeof v[0] === 'string') out[k] = v[0];
    }
  } else if (Array.isArray(candidate)) {
    for (const item of candidate) {
      if (isRecord(item)) {
        const field = item.field ?? item.property ?? item.path;
        const msg = item.message ?? item.defaultMessage;
        if (typeof field === 'string' && typeof msg === 'string') out[field] = msg;
      }
    }
  }
  return out;
}

/** Converts anything thrown by the HTTP layer into a consistent, safe-to-display ApiError. */
export function toApiError(err: unknown): ApiError {
  if (axios.isCancel(err)) {
    return { message: 'Request cancelled.', fieldErrors: {}, isNetwork: false, isTimeout: false, isCanceled: true };
  }
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError;
    const status = e.response?.status;
    const data = e.response?.data;
    if (!e.response) {
      const isTimeout = e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT';
      return {
        message: isTimeout
          ? 'The request timed out. Please try again.'
          : 'Cannot reach the Mail Service. Check that it is running, the API base URL is correct, and CORS allows this origin.',
        fieldErrors: {},
        isNetwork: !isTimeout,
        isTimeout,
        isCanceled: false,
      };
    }
    const fallback =
      status === 404 ? 'The requested resource was not found.'
      : status && status >= 500 ? 'The server encountered an error. Please try again later.'
      : `Request failed${status ? ` (HTTP ${status})` : ''}.`;
    return {
      message: pickMessage(data) ?? fallback,
      status,
      fieldErrors: pickFieldErrors(data),
      isNetwork: false,
      isTimeout: false,
      isCanceled: false,
      details: data,
    };
  }
  return {
    message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    fieldErrors: {}, isNetwork: false, isTimeout: false, isCanceled: false,
  };
}
