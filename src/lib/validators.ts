import { z } from 'zod';

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

/** Fields come from the sample request body in the Postman collection. Which are required is unconfirmed,
 *  so only `email` is mandatory (a record without an address is meaningless). */
export const EMAIL_STATUSES = ['UNVERIFIED', 'VERIFIED', 'INVALID', 'BOUNCED'] as const;

export const emailRecordSchema = z.object({
  firstName: optionalText(100, 'First name'),
  lastName: optionalText(100, 'Last name'),
  email: z.string().trim().min(1, 'Email is required').max(254, 'Email is too long').email('Enter a valid email address'),
  emailStatus: optionalText(50, 'Status'),
  jobTitle: optionalText(150, 'Job title'),
  companyName: optionalText(150, 'Company name'),
  companyDomain: optionalText(253, 'Company domain').refine(
    (v) => v === '' || /^(?!-)([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v),
    'Enter a domain like example.com',
  ),
  location: optionalText(150, 'Location'),
});
export type EmailRecordForm = z.infer<typeof emailRecordSchema>;

export const emptyEmailRecord = (): EmailRecordForm => ({
  firstName: '', lastName: '', email: '', emailStatus: 'UNVERIFIED',
  jobTitle: '', companyName: '', companyDomain: '', location: '',
});

export const bulkSchema = z.object({
  rows: z.array(emailRecordSchema).min(1, 'Add at least one record').max(500, 'Up to 500 records per submission'),
});
export type BulkForm = z.infer<typeof bulkSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export const registerSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Use at least 6 characters'),
  confirm: z.string().min(1, 'Confirm your password'),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const sendMailSchema = z.object({
  to: z.string().trim().min(1, 'Recipient is required').email('Enter a valid email address'),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().trim().min(1, 'Message is required').max(10_000, 'Message is too long'),
});
export type SendMailForm = z.infer<typeof sendMailSchema>;

export const driveLinkSchema = z.object({
  driveLink: z.string().trim().min(1, 'Link is required').url('Enter a valid URL')
    .refine((v) => /^https:\/\/(drive|docs)\.google\.com\//i.test(v), 'Must be a Google Drive link'),
  fileName: z.string().trim().min(1, 'File name is required').max(150)
    .refine((v) => !/[\\/]/.test(v), 'File name cannot contain slashes'),
});
export type DriveLinkForm = z.infer<typeof driveLinkSchema>;

export const EXCEL_EXTENSIONS = ['.xlsx', '.xls'] as const;
export function validateExcelFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'Only .xlsx or .xls files are supported.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}
