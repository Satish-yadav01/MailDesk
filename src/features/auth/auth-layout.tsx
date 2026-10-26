import type { ReactNode } from 'react';
import { Logo } from '@/components/common/logo';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.18),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="text-3xl font-semibold leading-tight">Keep every email record<br />clean, current and in one place.</p>
          <p className="mt-3 max-w-md text-brand-100">Create records, import spreadsheets and track processing from a single workspace.</p>
        </div>
      </aside>
    </div>
  );
}
