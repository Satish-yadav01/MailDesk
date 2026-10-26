import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 font-semibold tracking-tight text-slate-900', className)} aria-label="MailDesk home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm"><Mail className="h-4 w-4" aria-hidden /></span>
      <span className="text-lg">MailDesk</span>
    </Link>
  );
}
