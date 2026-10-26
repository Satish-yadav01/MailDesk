import { describe, expect, it } from 'vitest';
import { bulkSchema, driveLinkSchema, emailRecordSchema, emptyEmailRecord, loginSchema, registerSchema, validateExcelFile } from './validators';

describe('emailRecordSchema', () => {
  it('requires a valid email', () => {
    expect(emailRecordSchema.safeParse({ ...emptyEmailRecord(), email: '' }).success).toBe(false);
    expect(emailRecordSchema.safeParse({ ...emptyEmailRecord(), email: 'not-an-email' }).success).toBe(false);
    expect(emailRecordSchema.safeParse({ ...emptyEmailRecord(), email: 'ada@example.com' }).success).toBe(true);
  });
  it('validates company domain format when provided', () => {
    expect(emailRecordSchema.safeParse({ ...emptyEmailRecord(), email: 'a@b.co', companyDomain: 'bad domain' }).success).toBe(false);
    expect(emailRecordSchema.safeParse({ ...emptyEmailRecord(), email: 'a@b.co', companyDomain: 'example.com' }).success).toBe(true);
  });
});
describe('bulkSchema', () => {
  it('needs at least one row and reports row-level errors', () => {
    expect(bulkSchema.safeParse({ rows: [] }).success).toBe(false);
    const r = bulkSchema.safeParse({ rows: [{ ...emptyEmailRecord(), email: 'ok@x.com' }, { ...emptyEmailRecord(), email: 'bad' }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path.slice(0, 2)).toEqual(['rows', 1]);
  });
});
describe('auth schemas', () => {
  it('validates login', () => {
    expect(loginSchema.safeParse({ email: 'x', password: 'p' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'x@y.com', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'x@y.com', password: 'p' }).success).toBe(true);
  });
  it('checks password match and length on register', () => {
    expect(registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'short', confirm: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'longenough', confirm: 'different' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'longenough', confirm: 'longenough' }).success).toBe(true);
  });
});
describe('driveLinkSchema', () => {
  it('only accepts Google Drive links', () => {
    expect(driveLinkSchema.safeParse({ driveLink: 'https://evil.example.com/x', fileName: 'r.pdf' }).success).toBe(false);
    expect(driveLinkSchema.safeParse({ driveLink: 'https://drive.google.com/file/d/1/view', fileName: 'r.pdf' }).success).toBe(true);
  });
});
describe('validateExcelFile', () => {
  it('accepts xlsx/xls and rejects others or empty', () => {
    expect(validateExcelFile(new File(['x'], 'a.xlsx'))).toBeNull();
    expect(validateExcelFile(new File(['x'], 'A.XLS'))).toBeNull();
    expect(validateExcelFile(new File(['x'], 'a.csv'))).toMatch(/xlsx/);
    expect(validateExcelFile(new File([], 'a.xlsx'))).toMatch(/empty/);
  });
});
