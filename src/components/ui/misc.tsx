import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Skeleton = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) =>
  <div aria-hidden className={cn('animate-pulse rounded-md bg-slate-200/70', className)} {...p} />;

type Tone = 'slate' | 'brand' | 'green' | 'amber' | 'rose';
const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700', brand: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700',
};
export const Badge = ({ tone = 'slate', className, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) =>
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...p} />;

const alertStyles = {
  info: { box: 'border-brand-200 bg-brand-50 text-brand-900', Icon: Info },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icon: CheckCircle2 },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: TriangleAlert },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', Icon: AlertCircle },
} as const;
export function Alert({ variant = 'info', title, children, className }: { variant?: keyof typeof alertStyles; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = alertStyles[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">{title && <p className="font-semibold">{title}</p>}{children && <div className="break-words">{children}</div>}</div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle className="h-6 w-6" /></div>
      <h3 className="text-sm font-semibold text-slate-900">Something went wrong</h3>
      <p className="mt-1 max-w-md break-words text-sm text-slate-500">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Try again</button>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
