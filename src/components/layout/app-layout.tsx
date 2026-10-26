import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { LogOut, Menu as MenuIcon, X } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
          <Icon className="h-4 w-4" aria-hidden />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const initials = (user?.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const doLogout = async () => { await logout(); nav('/', { replace: true }); };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <Logo to="/app" className="px-2 py-2" />
        <div className="mt-6 flex-1 overflow-y-auto"><NavList /></div>
      </aside>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-4 shadow-2xl lg:hidden" aria-describedby={undefined}>
            <div className="mb-6 flex items-center justify-between">
              <Dialog.Title asChild><div><Logo to="/app" /></div></Dialog.Title>
              <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close menu"><X className="h-4 w-4" /></Button></Dialog.Close>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><MenuIcon className="h-5 w-5" /></Button>
          <div className="hidden lg:block" />
          <Menu.Root>
            <Menu.Trigger asChild>
              <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100" aria-label="Profile menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials}</span>
                <span className="hidden text-sm font-medium text-slate-700 sm:block">{user?.name}</span>
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <Menu.Separator className="my-1 h-px bg-slate-100" />
                <Menu.Item onSelect={() => void doLogout()} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100">
                  <LogOut className="h-4 w-4" aria-hidden />Log out
                </Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
