import { describe, expect, it } from 'vitest';
import { normalizeEmailPage } from '@/services/normalizers';
import { buildEmailCsv } from './email-export';

describe('buildEmailCsv', () => {
  it('creates delimited rows and escapes quotes, commas, and newlines', () => {
    const records = normalizeEmailPage([{
      email: 'ada@example.com',
      firstName: 'Ada, "Countess"',
      lastName: 'Lovelace',
      emailStatus: 'VERIFIED',
      companyName: 'NPST',
      jobTitle: 'Engineer',
      location: 'London\nUK',
      createdAt: '2026-10-31T12:00:00Z',
    }], 0, 1).items;

    const csv = buildEmailCsv(records);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Email","Name","Status","Company","Title","Location","Created"\r\n');
    expect(csv).toContain('"ada@example.com","Ada, ""Countess"" Lovelace","VERIFIED","NPST","Engineer","London\nUK",');
  });

  it('treats formula-like values as text for spreadsheet safety', () => {
    const records = normalizeEmailPage([{ email: '=HYPERLINK("https://example.com","click")' }], 0, 1).items;
    expect(buildEmailCsv(records)).toContain(`"'=HYPERLINK(""https://example.com"",""click"")"`);
  });
});
