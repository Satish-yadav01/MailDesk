import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-card', className)} {...p} />;
export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:px-6', className)} {...p} />;
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) =>
  <h2 className={cn('text-base font-semibold text-slate-900', className)} {...p} />;
export const CardDescription = ({ className, ...p }: HTMLAttributes<HTMLParagraphElement>) =>
  <p className={cn('text-sm text-slate-500', className)} {...p} />;
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('px-5 py-5 sm:px-6', className)} {...p} />;
