import { describe, expect, it } from 'vitest';
import { normalizeEmailPage, normalizeHeaders, normalizeSubmission, normalizeTransaction, normalizeRecord } from './normalizers';

describe('normalizeEmailPage', () => {
  it('handles a bare array', () => {
    const p = normalizeEmailPage([{ email: 'a@b.co' }], 0, 10);
    expect(p.items).toHaveLength(1);
    expect(p.totalElements).toBeNull();
  });
  it('handles a Spring-style page', () => {
    const p = normalizeEmailPage({ content: [{ id: 5, email: 'a@b.co' }], totalElements: 21, number: 1, size: 10 }, 0, 10);
    expect(p.items[0].id).toBe('5');
    expect(p.totalPages).toBe(3);
    expect(p.page).toBe(1);
  });
  it('survives garbage', () => {
    expect(normalizeEmailPage(null, 0, 10).items).toEqual([]);
    expect(normalizeEmailPage('oops', 0, 10).items).toEqual([]);
    expect(normalizeEmailPage({ content: [null, 3, { email: null }] }, 0, 10).items).toHaveLength(3);
  });
});
describe('normalizeRecord', () => {
  it('nulls missing values and keeps unknown fields in extra', () => {
    const r = normalizeRecord({ email: 'a@b.co', firstName: null, score: 4 }, 0);
    expect(r.firstName).toBeNull();
    expect(r.extra).toEqual({ score: 4 });
  });
});
describe('normalizeHeaders', () => {
  it('accepts arrays and wrapped arrays', () => {
    expect(normalizeHeaders(['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeHeaders({ headers: [{ name: 'x' }] })).toEqual(['x']);
    expect(normalizeHeaders(undefined)).toEqual([]);
  });
});
describe('normalizeSubmission', () => {
  it('extracts tid or throws', () => {
    expect(normalizeSubmission({ tid: 12 }).tid).toBe('12');
    expect(() => normalizeSubmission({})).toThrow(/transaction ID/);
  });
});
describe('normalizeTransaction', () => {
  it('flags terminal and failure states', () => {
    expect(normalizeTransaction({ status: 'COMPLETED' }, '1')).toMatchObject({ isTerminal: true, isFailure: false });
    expect(normalizeTransaction({ status: 'failed' }, '1')).toMatchObject({ isTerminal: true, isFailure: true });
    expect(normalizeTransaction({ status: 'PROCESSING' }, '1').isTerminal).toBe(false);
    expect(normalizeTransaction('weird', '1')).toMatchObject({ status: null, statusCode: null });
  });
  it('normalizes the Spring transaction enquiry response and stops polling on HTTP 200', () => {
    expect(normalizeTransaction({
      txnStatus: 'SUCCESS',
      statusCode: 200,
      statusMsg: 'Excel import completed successfully',
    }, '1')).toMatchObject({
      status: 'SUCCESS',
      statusCode: 200,
      message: 'Excel import completed successfully',
      isTerminal: true,
      isFailure: false,
    });
    expect(normalizeTransaction({ txnStatus: 'PENDING', statusCode: 200 }, '1').isTerminal).toBe(true);
  });
  it('keeps polling while the Spring transaction is pending', () => {
    expect(normalizeTransaction({ txnStatus: 'PENDING', statusCode: 202, statusMsg: 'Processing' }, '1'))
      .toMatchObject({ status: 'PENDING', statusCode: 202, message: 'Processing', isTerminal: false });
  });
});
