import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';
import { TextField } from '@/components/ui/form';
import type { EmailRecordForm } from '@/lib/validators';

type Reg = (name: keyof EmailRecordForm) => UseFormRegisterReturn;

/** Shared field set used by the single and bulk forms. */
export function RecordFields({ register, errors, idPrefix = '', serverErrors = {}, showEmailStatus = true }: {
  register: Reg; errors?: FieldErrors<EmailRecordForm>; idPrefix?: string; serverErrors?: Record<string, string>; showEmailStatus?: boolean;
}) {
  const err = (k: keyof EmailRecordForm) => errors?.[k]?.message ?? serverErrors[k];
  const id = (k: string) => `${idPrefix}${k}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField id={id('firstName')} label="First name" placeholder="Ada" autoComplete="off" error={err('firstName')} {...register('firstName')} />
      <TextField id={id('lastName')} label="Last name" placeholder="Lovelace" autoComplete="off" error={err('lastName')} {...register('lastName')} />
      <TextField id={id('email')} className="sm:col-span-2" label="Email address" type="email" required placeholder="ada@example.com" autoComplete="off" error={err('email')} {...register('email')} />
      {showEmailStatus && <TextField id={id('emailStatus')} label="Email status" placeholder="UNVERIFIED" hint="Defaults to UNVERIFIED." error={err('emailStatus')} {...register('emailStatus')} />}
      <TextField id={id('jobTitle')} label="Job title" placeholder="Engineer" error={err('jobTitle')} {...register('jobTitle')} />
      <TextField id={id('companyName')} label="Company name" placeholder="Example Company" error={err('companyName')} {...register('companyName')} />
      <TextField id={id('companyDomain')} label="Company domain" placeholder="example.com" error={err('companyDomain')} {...register('companyDomain')} />
      <TextField id={id('location')} className="sm:col-span-2" label="Location" placeholder="London" error={err('location')} {...register('location')} />
    </div>
  );
}

/** Drops empty optional strings so only meaningful fields are sent. */
export function toPayload(v: EmailRecordForm) {
  return Object.fromEntries(Object.entries(v).filter(([k, val]) => k === 'email' || (typeof val === 'string' && val.trim() !== ''))) as unknown as import('@/types/api').EmailRecordInput;
}
