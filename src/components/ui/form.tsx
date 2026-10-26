import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base = 'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500';

interface FieldProps {
  label: string; hint?: string; error?: string; required?: boolean; className?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const auto = useId(); const fid = id ?? auto;
    return (
      <div className={className}>
        <label htmlFor={fid} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}{required && <span className="ml-0.5 text-rose-600" aria-hidden>*</span>}
        </label>
        <input ref={ref} id={fid} required={false} aria-required={required || undefined} aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cn(base, 'h-10', error ? 'border-rose-400' : 'border-slate-200')} {...props} />
        {error ? <p id={`${fid}-err`} role="alert" className="mt-1.5 text-xs text-rose-600">{error}</p>
          : hint ? <p id={`${fid}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const auto = useId(); const fid = id ?? auto;
    return (
      <div className={className}>
        <label htmlFor={fid} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}{required && <span className="ml-0.5 text-rose-600" aria-hidden>*</span>}
        </label>
        <textarea ref={ref} id={fid} aria-required={required || undefined} aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cn(base, 'py-2', error ? 'border-rose-400' : 'border-slate-200')} {...props} />
        {error ? <p id={`${fid}-err`} role="alert" className="mt-1.5 text-xs text-rose-600">{error}</p>
          : hint ? <p id={`${fid}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-slate-900">{title}</legend>
      {description && <p className="-mt-2 text-xs text-slate-500">{description}</p>}
      {children}
    </fieldset>
  );
}
