import axios, { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { toApiError } from './api-errors';

const withResponse = (status: number, data: unknown) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never });

describe('toApiError', () => {
  it('reads server message and field errors', () => {
    const e = toApiError(withResponse(400, { message: 'Bad', errors: { email: 'Invalid' } }));
    expect(e.message).toBe('Bad'); expect(e.fieldErrors.email).toBe('Invalid'); expect(e.status).toBe(400);
  });
  it('reads array-style violations', () => {
    expect(toApiError(withResponse(422, { errors: [{ field: 'email', message: 'dup' }] })).fieldErrors.email).toBe('dup');
  });
  it('falls back for 5xx without a body', () => {
    expect(toApiError(withResponse(500, '')).message).toMatch(/server/i);
  });
  it('detects network failures', () => {
    const e = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(e.isNetwork).toBe(true); expect(e.message).toMatch(/Cannot reach/);
  });
  it('detects timeouts and cancellations', () => {
    expect(toApiError(new AxiosError('t', 'ECONNABORTED')).isTimeout).toBe(true);
    expect(toApiError(new axios.Cancel('c')).isCanceled).toBe(true);
  });
  it('handles unknown values', () => { expect(toApiError(undefined).message).toMatch(/unexpected/i); });
});
