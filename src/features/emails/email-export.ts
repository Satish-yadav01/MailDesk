import type { EmailRecord } from '@/types/api';
import { formatDate } from '@/utils/format';

const columns: { name: string; value: (record: EmailRecord) => string }[] = [
  { name: 'Email', value: (record) => record.email ?? '' },
  { name: 'Name', value: (record) => [record.firstName, record.lastName].filter(Boolean).join(' ') },
  { name: 'Status', value: (record) => record.emailStatus ?? '' },
  { name: 'Company', value: (record) => record.companyName ?? '' },
  { name: 'Title', value: (record) => record.jobTitle ?? '' },
  { name: 'Location', value: (record) => record.location ?? '' },
  { name: 'Created', value: (record) => record.createdAt ? formatDate(record.createdAt) : '' },
];

function csvCell(value: string): string {
  const safeValue = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function buildEmailCsv(records: EmailRecord[]): string {
  const header = columns.map(({ name }) => csvCell(name)).join(',');
  const rows = records.map((record) =>
    columns.map(({ value }) => csvCell(value(record))).join(','),
  );
  return `\uFEFF${[header, ...rows].join('\r\n')}`;
}
