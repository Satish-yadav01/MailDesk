import { Link } from 'react-router-dom';
import { FileSpreadsheet, ListChecks, Plus, RefreshCw, Rows3, Users, Activity, Inbox, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/misc';
import { useAuth } from '@/features/auth/auth-context';
import { useEmailList, useServiceHealth } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { display, formatDate } from '@/utils/format';

const ACTIONS = [
  { to: '/app/emails', label: 'View Email List', icon: ListChecks },
  { to: '/app/emails/new', label: 'Create Single Email', icon: Plus },
  { to: '/app/emails/bulk', label: 'Create Multiple Emails', icon: Rows3 },
  { to: '/app/import', label: 'Upload Excel File', icon: FileSpreadsheet },
];

export function DashboardPage() {
  const { user } = useAuth();
  const list = useEmailList(0, 5);
  const health = useServiceHealth();
  const total = list.data?.totalElements;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back, {user?.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Here’s what’s in your workspace right now.</p>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Users className="h-5 w-5" aria-hidden /></span>
          <div><p className="text-xs text-slate-500">Total email records</p>
            {list.isPending ? <Skeleton className="mt-1 h-7 w-16" /> : list.isError ? <p className="text-sm text-slate-400">Unavailable</p>
              : <p className="text-2xl font-semibold text-slate-900">{total ?? '—'}</p>}
            {total === null && !list.isPending && !list.isError && <p className="text-xs text-slate-400">Not reported by API</p>}
          </div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Activity className="h-5 w-5" aria-hidden /></span>
          <div><p className="text-xs text-slate-500">Mail service</p>
            {health.isPending ? <Skeleton className="mt-1 h-7 w-20" />
              : health.isError ? <Badge tone="rose" className="mt-1">Unreachable</Badge>
              : <Badge tone={health.data.ok ? 'green' : 'amber'} className="mt-1">{health.data.ok ? 'Healthy' : 'Degraded'}</Badge>}
          </div></CardContent></Card>
        <Link to="/app/transactions" className="block rounded-2xl"><Card className="h-full transition hover:border-brand-300"><CardContent className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Search className="h-5 w-5" aria-hidden /></span>
          <div><p className="text-xs text-slate-500">Track a submission</p><p className="text-sm font-medium text-slate-900">Check transaction status</p></div>
        </CardContent></Card></Link>
      </section>

      <section aria-label="Quick actions">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-card transition hover:border-brand-300 hover:shadow-pop">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-4 w-4" aria-hidden /></span>{label}
            </Link>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Recent records</CardTitle><CardDescription>First page of the list, as returned by the API.</CardDescription></div>
          <Button variant="secondary" size="sm" onClick={() => void list.refetch()} loading={list.isFetching}>{!list.isFetching && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}Refresh</Button>
        </CardHeader>
        {list.isPending ? <div className="space-y-2 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          : list.isError ? <ErrorState message={toApiError(list.error).message} onRetry={() => void list.refetch()} />
          : list.data.items.length === 0 ? <EmptyState icon={<Inbox className="h-6 w-6" />} title="No records yet" description="Create your first record to see it here." action={<Button asChild><Link to="/app/emails/new">Create email</Link></Button>} />
          : <ul className="divide-y divide-slate-100">{list.data.items.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{display(r.email)}</p>
                  <p className="truncate text-xs text-slate-500">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}{r.companyName ? ` · ${r.companyName}` : ''}</p></div>
                {r.createdAt && <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{formatDate(r.createdAt)}</span>}
              </li>))}</ul>}
      </Card>
    </div>
  );
}
